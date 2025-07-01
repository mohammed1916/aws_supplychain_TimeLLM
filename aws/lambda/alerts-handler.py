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
cloudwatch = boto3.client('cloudwatch')
sns = boto3.client('sns')

# DynamoDB tables
ALERTS_TABLE = dynamodb.Table('timewise-alerts')
INVENTORY_TABLE = dynamodb.Table('timewise-inventory-alerts')

def lambda_handler(event, context):
    """
    Lambda function to handle alerts and monitoring data
    """
    try:
        # Check if this is a CloudWatch alarm trigger
        if 'source' in event and event['source'] == 'aws.cloudwatch':
            return handle_cloudwatch_alarm(event)
        
        # Handle HTTP API requests
        http_method = event.get('httpMethod', 'GET')
        path_parameters = event.get('pathParameters') or {}
        
        if http_method == 'GET':
            return get_alerts()
        elif http_method == 'POST':
            alert_id = path_parameters.get('id')
            action = path_parameters.get('action')
            if action == 'acknowledge':
                return acknowledge_alert(alert_id)
            else:
                body = json.loads(event.get('body', '{}'))
                return create_alert(body)
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

def handle_cloudwatch_alarm(event: Dict[str, Any]) -> Dict[str, Any]:
    """Handle CloudWatch alarm notifications"""
    try:
        detail = event.get('detail', {})
        alarm_name = detail.get('alarmName', '')
        state = detail.get('state', {}).get('value', '')
        
        if state == 'ALARM':
            # Create alert based on CloudWatch alarm
            alert_data = {
                'type': 'critical' if 'critical' in alarm_name.lower() else 'warning',
                'category': determine_category(alarm_name),
                'title': f"CloudWatch Alarm: {alarm_name}",
                'message': detail.get('state', {}).get('reason', 'Alarm triggered'),
                'source': 'AWS CloudWatch',
                'metadata': {
                    'alarmName': alarm_name,
                    'metricName': detail.get('metricName', ''),
                    'threshold': detail.get('threshold', 0)
                }
            }
            
            create_alert(alert_data)
            
            # Send SNS notification for critical alerts
            if alert_data['type'] == 'critical':
                send_sns_notification(alert_data)
        
        return {'statusCode': 200}
        
    except Exception as e:
        logger.error(f"Error handling CloudWatch alarm: {str(e)}")
        raise

def get_alerts() -> Dict[str, Any]:
    """Get all alerts from DynamoDB"""
    try:
        response = ALERTS_TABLE.scan()
        alerts = response.get('Items', [])
        
        # Sort by timestamp (most recent first)
        alerts.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Convert Decimal to float
        alerts = convert_decimals(alerts)
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'alerts': alerts,
                'count': len(alerts),
                'unacknowledged': len([a for a in alerts if not a.get('acknowledged', False)])
            })
        }
        
    except Exception as e:
        logger.error(f"Error getting alerts: {str(e)}")
        raise

def create_alert(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create new alert in DynamoDB"""
    try:
        alert_item = {
            'alertId': f"alert_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}",
            'type': data.get('type', 'info'),
            'category': data.get('category', 'system'),
            'title': data.get('title', 'Alert'),
            'message': data.get('message', ''),
            'timestamp': datetime.utcnow().isoformat(),
            'source': data.get('source', 'System'),
            'acknowledged': False,
            'actionRequired': data.get('actionRequired', False),
            'metadata': data.get('metadata', {})
        }
        
        ALERTS_TABLE.put_item(Item=alert_item)
        
        # Log metrics
        cloudwatch.put_metric_data(
            Namespace='TimeWise/Alerts',
            MetricData=[
                {
                    'MetricName': 'AlertsCreated',
                    'Value': 1,
                    'Unit': 'Count',
                    'Dimensions': [
                        {
                            'Name': 'AlertType',
                            'Value': alert_item['type']
                        },
                        {
                            'Name': 'Category',
                            'Value': alert_item['category']
                        }
                    ]
                }
            ]
        )
        
        return {
            'statusCode': 201,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'alert': convert_decimals(alert_item),
                'message': 'Alert created successfully'
            })
        }
        
    except Exception as e:
        logger.error(f"Error creating alert: {str(e)}")
        raise

def acknowledge_alert(alert_id: str) -> Dict[str, Any]:
    """Acknowledge an alert"""
    try:
        response = ALERTS_TABLE.update_item(
            Key={'alertId': alert_id},
            UpdateExpression='SET acknowledged = :ack, acknowledgedAt = :time',
            ExpressionAttributeValues={
                ':ack': True,
                ':time': datetime.utcnow().isoformat()
            },
            ReturnValues='ALL_NEW'
        )
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'alert': convert_decimals(response['Attributes']),
                'message': 'Alert acknowledged successfully'
            })
        }
        
    except Exception as e:
        logger.error(f"Error acknowledging alert: {str(e)}")
        raise

def determine_category(alarm_name: str) -> str:
    """Determine alert category based on alarm name"""
    alarm_lower = alarm_name.lower()
    if 'inventory' in alarm_lower or 'stock' in alarm_lower:
        return 'inventory'
    elif 'demand' in alarm_lower or 'forecast' in alarm_lower:
        return 'demand'
    elif 'supply' in alarm_lower or 'supplier' in alarm_lower:
        return 'supply'
    elif 'security' in alarm_lower or 'access' in alarm_lower:
        return 'security'
    else:
        return 'system'

def send_sns_notification(alert_data: Dict[str, Any]):
    """Send SNS notification for critical alerts"""
    try:
        topic_arn = 'arn:aws:sns:us-east-1:123456789012:timewise-critical-alerts'
        
        message = {
            'title': alert_data['title'],
            'message': alert_data['message'],
            'type': alert_data['type'],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        sns.publish(
            TopicArn=topic_arn,
            Message=json.dumps(message),
            Subject=f"TimeWise Critical Alert: {alert_data['title']}"
        )
        
    except Exception as e:
        logger.error(f"Error sending SNS notification: {str(e)}")

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