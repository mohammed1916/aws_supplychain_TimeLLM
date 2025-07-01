# TimeWise Supply Chain - AWS TimeLLM Platform

An AI-powered supply chain optimization platform using TimeLLM on AWS for demand forecasting, inventory optimization, and intelligent decision-making.

## 🏗️ Architecture Overview

This application integrates multiple AWS services to provide a comprehensive supply chain management solution:

### Frontend
- **React + TypeScript**: Modern web application with responsive design
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Beautiful icon library

### Backend Services
- **Amazon DynamoDB**: NoSQL database for storing forecasts, alerts, KPIs, and user data
- **AWS Lambda**: Serverless functions for API endpoints and data processing
- **Amazon API Gateway**: RESTful API management and routing
- **Amazon SageMaker**: TimeLLM model hosting and inference
- **Amazon CloudWatch**: Real-time monitoring and alerting
- **Amazon S3**: Data lake for historical data storage
- **AWS Glue**: ETL pipeline for data processing

## 🚀 Features

### 1. **Real-time Dashboard**
- Live KPI monitoring with automatic refresh
- Dynamic forecast visualization
- Critical alerts and notifications
- AWS services health status

### 2. **Data Pipeline Management**
- Multiple data source integration (S3, Kinesis, RDS, APIs)
- Real-time data quality monitoring
- AWS Glue ETL pipeline status
- Data processing statistics

### 3. **AI-Powered Optimization**
- TimeLLM demand forecasting
- Inventory optimization recommendations
- Route and warehouse optimization
- Cost reduction analysis

### 4. **Intelligent Monitoring**
- Real-time alerts from CloudWatch
- Bias detection and mitigation
- System health monitoring
- Automated alert acknowledgment

### 5. **Advanced Analytics**
- AI-generated insights and recommendations
- Automated report generation
- Executive dashboards
- Compliance reporting

### 6. **Responsible AI**
- Role-based access control (RBAC)
- AI governance metrics
- Bias monitoring and mitigation
- Audit trail and compliance

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- AWS Account with appropriate permissions
- AWS CLI configured

### 1. Clone and Install
```bash
git clone <repository-url>
cd timewise-supply-chain-aws
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your AWS configuration
```

### 3. Deploy AWS Infrastructure

#### Deploy DynamoDB Tables
```bash
aws cloudformation deploy \
  --template-file aws/cloudformation/dynamodb-tables.yaml \
  --stack-name timewise-dynamodb \
  --parameter-overrides Environment=prod
```

#### Deploy Lambda Functions
```bash
# Package and deploy Lambda functions
cd aws/lambda
zip -r forecasts-handler.zip forecasts-handler.py
zip -r alerts-handler.zip alerts-handler.py

# Deploy via AWS CLI or CloudFormation
aws lambda create-function \
  --function-name timewise-forecasts-handler \
  --runtime python3.9 \
  --role arn:aws:iam::YOUR-ACCOUNT:role/lambda-execution-role \
  --handler forecasts-handler.lambda_handler \
  --zip-file fileb://forecasts-handler.zip
```

#### Deploy API Gateway
```bash
aws cloudformation deploy \
  --template-file aws/cloudformation/api-gateway.yaml \
  --stack-name timewise-api \
  --parameter-overrides \
    Environment=prod \
    ForecastsLambdaArn=arn:aws:lambda:region:account:function:timewise-forecasts-handler \
    AlertsLambdaArn=arn:aws:lambda:region:account:function:timewise-alerts-handler
```

### 4. Configure SageMaker TimeLLM Endpoint
```bash
# Deploy your TimeLLM model to SageMaker
# Update the endpoint name in your .env file
```

### 5. Start Development Server
```bash
npm run dev
```

## 📊 Data Flow

1. **Data Ingestion**: Historical sales data, market trends, and real-time inventory data flow into S3
2. **ETL Processing**: AWS Glue processes and cleans the data
3. **ML Inference**: SageMaker TimeLLM generates demand forecasts
4. **Storage**: Results stored in DynamoDB tables
5. **API Layer**: Lambda functions serve data via API Gateway
6. **Frontend**: React application displays real-time insights
7. **Monitoring**: CloudWatch monitors system health and triggers alerts

## 🔧 API Endpoints

### Forecasts
- `GET /forecasts` - Retrieve demand forecasts
- `POST /forecasts` - Generate new forecast using TimeLLM
- `PUT /forecasts/{id}` - Update forecast status

### Alerts
- `GET /alerts` - Get all alerts
- `POST /alerts/{id}/acknowledge` - Acknowledge alert
- `POST /alerts` - Create new alert

### Data Sources
- `GET /data-sources` - Get data source status
- `PUT /data-sources/{id}` - Update data source configuration

### Optimization
- `GET /optimization-scenarios` - Get optimization scenarios
- `POST /optimization-scenarios/{id}/run` - Run optimization

## 🔒 Security Features

- **IAM Roles**: Least privilege access for all AWS services
- **API Authentication**: Bearer token authentication
- **CORS Configuration**: Secure cross-origin requests
- **Data Encryption**: At-rest and in-transit encryption
- **Audit Logging**: Complete audit trail via CloudTrail

## 📈 Monitoring & Observability

- **CloudWatch Metrics**: Custom metrics for business KPIs
- **CloudWatch Alarms**: Automated alerting for critical thresholds
- **X-Ray Tracing**: Distributed tracing for performance monitoring
- **Custom Dashboards**: Real-time operational dashboards

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

## 🚀 Deployment

### Production Deployment
```bash
# Build for production
npm run build

# Deploy to S3 + CloudFront
aws s3 sync dist/ s3://your-bucket-name
aws cloudfront create-invalidation --distribution-id YOUR-DISTRIBUTION-ID --paths "/*"
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the AWS documentation for service-specific issues

## 🔮 Future Enhancements

- [ ] Multi-region deployment
- [ ] Advanced ML model ensemble
- [ ] Real-time streaming analytics
- [ ] Mobile application
- [ ] Advanced visualization with D3.js
- [ ] Integration with external ERP systems