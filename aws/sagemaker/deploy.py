"""Deploy the TimeLLM model artifact to a SageMaker real-time endpoint.

Usage:
    python deploy.py \
        --model-data s3://your-model-bucket/timellm/model.tar.gz \
        --role arn:aws:iam::<ACCOUNT_ID>:role/<SAGEMAKER_EXECUTION_ROLE> \
        --endpoint-name timellm-forecast-endpoint \
        --instance-type ml.g5.xlarge

The model.tar.gz comes from the TimeLLM training pipeline and must contain
model.pt + config.json (see inference.py). After deployment, pass the endpoint
name to the Lambda stack (SageMakerEndpointName parameter) and re-deploy it so
the forecasts service gains invoke permission and configuration.

Cost note: a real-time endpoint bills per instance-hour while it exists.
Delete idle endpoints:  python deploy.py --delete --endpoint-name <name>
"""

import argparse

import boto3
from sagemaker.pytorch import PyTorchModel


def deploy(args: argparse.Namespace) -> None:
    model = PyTorchModel(
        model_data=args.model_data,
        role=args.role,
        entry_point="inference.py",
        source_dir=".",
        framework_version="2.3",
        py_version="py311",
        name=f"{args.endpoint_name}-model",
    )
    predictor = model.deploy(
        initial_instance_count=1,
        instance_type=args.instance_type,
        endpoint_name=args.endpoint_name,
    )
    print(f"Endpoint in service: {predictor.endpoint_name}")
    print("Next: pass this name as SageMakerEndpointName to the timewise-lambda stack.")


def delete(args: argparse.Namespace) -> None:
    client = boto3.client("sagemaker")
    client.delete_endpoint(EndpointName=args.endpoint_name)
    client.delete_endpoint_config(EndpointConfigName=args.endpoint_name)
    print(f"Deleted endpoint and config: {args.endpoint_name}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--endpoint-name", default="timellm-forecast-endpoint")
    parser.add_argument("--model-data", help="s3:// URI of model.tar.gz")
    parser.add_argument("--role", help="SageMaker execution role ARN")
    parser.add_argument("--instance-type", default="ml.g5.xlarge")
    parser.add_argument("--delete", action="store_true", help="tear the endpoint down")
    args = parser.parse_args()

    if args.delete:
        delete(args)
        return
    if not args.model_data or not args.role:
        parser.error("--model-data and --role are required to deploy")
    deploy(args)


if __name__ == "__main__":
    main()
