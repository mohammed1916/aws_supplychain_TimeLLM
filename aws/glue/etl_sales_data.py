"""Glue ETL job: standardize raw sales drops into partitioned Parquet.

Reads CSV files landed under s3://<raw_bucket>/sales/, applies schema and
quality rules, and writes snappy-compressed Parquet partitioned by year/month
to s3://<curated_bucket>/sales/ — the layout the curated-zone crawler catalogs
and TimeLLM training reads.

Quality rules:
  - rows must carry order_id, product_id, order_date, and a positive quantity
  - duplicate order_id + product_id pairs keep the most recent ingested row
  - unit_price is coerced to decimal; rows failing coercion are quarantined
    (written to s3://<curated_bucket>/quarantine/sales/) instead of dropped

Run counts are published to the TimeWise/DataLake CloudWatch namespace so the
dashboard can track pipeline throughput and rejection rates.
"""

import sys
from datetime import datetime, timezone

import boto3
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.sql import functions as F
from pyspark.sql.window import Window
from pyspark.sql.types import (
    DecimalType,
    IntegerType,
    StringType,
    StructField,
    StructType,
    TimestampType,
)

ARGS = getResolvedOptions(
    sys.argv, ["JOB_NAME", "raw_bucket", "curated_bucket", "environment"]
)

RAW_PATH = f"s3://{ARGS['raw_bucket']}/sales/"
CURATED_PATH = f"s3://{ARGS['curated_bucket']}/sales/"
QUARANTINE_PATH = f"s3://{ARGS['curated_bucket']}/quarantine/sales/"

RAW_SCHEMA = StructType(
    [
        StructField("order_id", StringType(), nullable=False),
        StructField("product_id", StringType(), nullable=False),
        StructField("order_date", TimestampType(), nullable=False),
        StructField("quantity", IntegerType(), nullable=True),
        StructField("unit_price", StringType(), nullable=True),  # coerced below
        StructField("warehouse_id", StringType(), nullable=True),
        StructField("channel", StringType(), nullable=True),
        StructField("ingested_at", TimestampType(), nullable=True),
    ]
)


def publish_metrics(cloudwatch, environment: str, **counts: int) -> None:
    cloudwatch.put_metric_data(
        Namespace="TimeWise/DataLake",
        MetricData=[
            {
                "MetricName": name,
                "Value": value,
                "Unit": "Count",
                "Timestamp": datetime.now(timezone.utc),
                "Dimensions": [{"Name": "Environment", "Value": environment}],
            }
            for name, value in counts.items()
        ],
    )


def main() -> None:
    spark_context = SparkContext()
    glue_context = GlueContext(spark_context)
    spark = glue_context.spark_session
    job = Job(glue_context)
    job.init(ARGS["JOB_NAME"], ARGS)

    raw = (
        spark.read.schema(RAW_SCHEMA)
        .option("header", "true")
        .option("mode", "PERMISSIVE")
        .csv(RAW_PATH)
    )
    total_rows = raw.count()

    # Coerce price; keep the failure signal instead of silently nulling.
    typed = raw.withColumn(
        "unit_price_decimal", F.col("unit_price").cast(DecimalType(12, 2))
    )

    valid_predicate = (
        F.col("order_id").isNotNull()
        & F.col("product_id").isNotNull()
        & F.col("order_date").isNotNull()
        & (F.col("quantity") > 0)
        & F.col("unit_price_decimal").isNotNull()
    )

    quarantined = typed.filter(~valid_predicate)
    valid = typed.filter(valid_predicate)

    # Keep the most recently ingested row per (order, product).
    deduped = valid.withColumn(
        "row_rank",
        F.row_number().over(
            Window.partitionBy("order_id", "product_id").orderBy(
                F.col("ingested_at").desc_nulls_last()
            )
        ),
    ).filter(F.col("row_rank") == 1)

    curated = (
        deduped.select(
            "order_id",
            "product_id",
            "order_date",
            "quantity",
            F.col("unit_price_decimal").alias("unit_price"),
            (F.col("quantity") * F.col("unit_price_decimal")).alias("line_total"),
            "warehouse_id",
            F.coalesce(F.col("channel"), F.lit("unknown")).alias("channel"),
        )
        .withColumn("year", F.year("order_date"))
        .withColumn("month", F.month("order_date"))
    )

    curated_count = curated.count()
    quarantine_count = quarantined.count()

    (
        curated.repartition("year", "month")
        .write.mode("append")
        .partitionBy("year", "month")
        .option("compression", "snappy")
        .parquet(CURATED_PATH)
    )

    if quarantine_count > 0:
        (
            quarantined.drop("unit_price_decimal", "row_rank")
            .write.mode("append")
            .option("compression", "snappy")
            .parquet(QUARANTINE_PATH)
        )

    publish_metrics(
        boto3.client("cloudwatch"),
        ARGS["environment"],
        RowsRead=total_rows,
        RowsCurated=curated_count,
        RowsQuarantined=quarantine_count,
    )

    job.commit()


if __name__ == "__main__":
    main()
