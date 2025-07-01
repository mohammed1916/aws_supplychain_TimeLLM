import json
import boto3
import logging
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
sagemaker_runtime = boto3.client('sagemaker-runtime')
cloudwatch = boto3.client('cloudwatch')

# DynamoDB table
FORECASTS_TABLE = dynamodb.Table('timewise-forecasts')
SAGEMAKER_ENDPOINT = 'timellm-forecast-endpoint'

def lambda_handler(event, context):
    """
    Lambda function to handle forecast data requests and SageMaker inference
    """
    try:
        http_method = event.get('httpMethod', 'GET')
        path_parameters = event.get('pathParameters') or {}
        query_parameters = event.get('queryStringParameters') or {}
        
        if http_method == 'GET':
            return get_forecasts(query_parameters)
        elif http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return create_forecast(body)
        elif http_method == 'PUT':
            forecast_id = path_parameters.get('id')
            body = json.loads(event.get('body', '{}'))
            return update_forecast(forecast_id, body)
        else:
            return {
                'statusCode': 405,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'Method not allowed'})
            }
            
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': 'Internal server error'})
        }

def get_forecasts(query_params: Dict[str, Any]) -> Dict[str, Any]:
    """Get forecast data from DynamoDB"""
    try:
        # Get optional filters
        product_id = query_params.get('productId')
        time_range = query_params.get('timeRange', '6months')
        
        # Scan table (in production, use query with proper indexes)
        response = FORECASTS_TABLE.scan()
        forecasts = response.get('Items', [])
        
        # Filter by product if specified
        if product_id:
            forecasts = [f for f in forecasts if f.get('productId') == product_id]
        
        # Convert Decimal to float for JSON serialization
        forecasts = convert_decimals(forecasts)
        
        # Log metrics to CloudWatch
        cloudwatch.put_metric_data(
            Namespace='TimeWise/API',
            MetricData=[
                {
                    'MetricName': 'ForecastsRetrieved',
                    'Value': len(forecasts),
                    'Unit': 'Count',
                    'Timestamp': datetime.utcnow()
                }
            ]
        )
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'forecasts': forecasts,
                'count': len(forecasts),
                'timestamp': datetime.utcnow().isoformat()
            })
        }
        
    except Exception as e:
        logger.error(f"Error getting forecasts: {str(e)}")
        raise

def create_forecast(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create new forecast using SageMaker TimeLLM model"""
    try:
        # Prepare input for SageMaker
        input_data = {
            'historical_data': data.get('historicalData', []),
            'forecast_horizon': data.get('forecastHorizon', 6),
            'product_id': data.get('productId'),
            'external_factors': data.get('externalFactors', {})
        }
        
        # Call SageMaker endpoint
        response = sagemaker_runtime.invoke_endpoint(
            EndpointName=SAGEMAKER_ENDPOINT,
            ContentType='application/json',
            Body=json.dumps(input_data)
        )
        
        # Parse SageMaker response
        result = json.loads(response['Body'].read().decode())
        
        # Store forecast in DynamoDB
        forecast_item = {
            'forecastId': f"forecast_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            'productId': data.get('productId'),
            'predictions': result.get('predictions', []),
            'confidence': Decimal(str(result.get('confidence', 0.95))),
            'createdAt': datetime.utcnow().isoformat(),
            'modelVersion': result.get('modelVersion', 'timellm-v1'),
            'accuracy': Decimal(str(result.get('accuracy', 0.96)))
        }
        
        FORECASTS_TABLE.put_item(Item=forecast_item)
        
        # Log metrics
        cloudwatch.put_metric_data(
            Namespace='TimeWise/ML',
            MetricData=[
                {
                    'MetricName': 'ForecastGenerated',
                    'Value': 1,
                    'Unit': 'Count'
                },
                {
                    'MetricName': 'ForecastAccuracy',
                    'Value': float(forecast_item['accuracy']),
                    'Unit': 'Percent'
                }
            ]
        )
        
        return {
            'statusCode': 201,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'forecast': convert_decimals(forecast_item),
                'message': 'Forecast created successfully'
            })
        }
        
    except Exception as e:
        logger.error(f"Error creating forecast: {str(e)}")
        raise

def update_forecast(forecast_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update existing forecast"""
    try:
        # Update forecast in DynamoDB
        response = FORECASTS_TABLE.update_item(
            Key={'forecastId': forecast_id},
            UpdateExpression='SET #status = :status, updatedAt = :updated',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': data.get('status', 'active'),
                ':updated': datetime.utcnow().isoformat()
            },
            ReturnValues='ALL_NEW'
        )
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'forecast': convert_decimals(response['Attributes']),
                'message': 'Forecast updated successfully'
            })
        }
        
    except Exception as e:
        logger.error(f"Error updating forecast: {str(e)}")
        raise

def convert_decimals(obj):
    """Convert DynamoDB Decimal types to float for JSON serialization"""
    if isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, Decimal):
        return float(obj)
    else:
        return obj

def get_cors_headers():
    """Return CORS headers for API responses"""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    }