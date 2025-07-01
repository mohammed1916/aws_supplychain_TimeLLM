// AWS Configuration
export const AWS_CONFIG = {
  region: process.env.VITE_AWS_REGION || 'us-east-1',
  apiGateway: {
    baseUrl: process.env.VITE_API_GATEWAY_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod'
  },
  dynamodb: {
    tables: {
      forecasts: 'timewise-forecasts',
      inventoryAlerts: 'timewise-inventory-alerts',
      kpis: 'timewise-kpis',
      dataSources: 'timewise-data-sources',
      optimizationScenarios: 'timewise-optimization-scenarios',
      inventoryOptimizations: 'timewise-inventory-optimizations',
      alerts: 'timewise-alerts',
      metrics: 'timewise-metrics',
      reports: 'timewise-reports',
      analyticsInsights: 'timewise-analytics-insights',
      accessControls: 'timewise-access-controls',
      governanceMetrics: 'timewise-governance-metrics',
      biasDetections: 'timewise-bias-detections'
    }
  },
  sagemaker: {
    endpointName: process.env.VITE_SAGEMAKER_ENDPOINT || 'timellm-forecast-endpoint'
  },
  cloudwatch: {
    namespace: 'TimeWise/SupplyChain'
  }
};

export const API_ENDPOINTS = {
  forecasts: `${AWS_CONFIG.apiGateway.baseUrl}/forecasts`,
  inventoryAlerts: `${AWS_CONFIG.apiGateway.baseUrl}/inventory-alerts`,
  kpis: `${AWS_CONFIG.apiGateway.baseUrl}/kpis`,
  dataSources: `${AWS_CONFIG.apiGateway.baseUrl}/data-sources`,
  optimizationScenarios: `${AWS_CONFIG.apiGateway.baseUrl}/optimization-scenarios`,
  inventoryOptimizations: `${AWS_CONFIG.apiGateway.baseUrl}/inventory-optimizations`,
  alerts: `${AWS_CONFIG.apiGateway.baseUrl}/alerts`,
  metrics: `${AWS_CONFIG.apiGateway.baseUrl}/metrics`,
  reports: `${AWS_CONFIG.apiGateway.baseUrl}/reports`,
  analyticsInsights: `${AWS_CONFIG.apiGateway.baseUrl}/analytics-insights`,
  accessControls: `${AWS_CONFIG.apiGateway.baseUrl}/access-controls`,
  governanceMetrics: `${AWS_CONFIG.apiGateway.baseUrl}/governance-metrics`,
  biasDetections: `${AWS_CONFIG.apiGateway.baseUrl}/bias-detections`,
  sagemakerInference: `${AWS_CONFIG.apiGateway.baseUrl}/sagemaker/inference`
};