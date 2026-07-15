// Frontend runtime configuration.
// Vite exposes environment variables on `import.meta.env` (never `process.env`),
// and only variables prefixed with VITE_ reach the browser bundle.

const env = import.meta.env;

export const AWS_CONFIG = {
  region: env.VITE_AWS_REGION ?? 'us-east-1',
  apiGateway: {
    baseUrl: (env.VITE_API_GATEWAY_URL ?? '').replace(/\/+$/, ''),
  },
  auth: {
    // Reserved for Cognito integration; unused until authentication ships.
    userPoolId: env.VITE_COGNITO_USER_POOL_ID ?? '',
    clientId: env.VITE_COGNITO_CLIENT_ID ?? '',
  },
  features: {
    realTimeUpdates: env.VITE_ENABLE_REAL_TIME_UPDATES !== 'false',
    advancedAnalytics: env.VITE_ENABLE_ADVANCED_ANALYTICS !== 'false',
    aiInsights: env.VITE_ENABLE_AI_INSIGHTS !== 'false',
  },
} as const;

export const isApiConfigured = (): boolean => AWS_CONFIG.apiGateway.baseUrl.length > 0;

const base = AWS_CONFIG.apiGateway.baseUrl;

export const API_ENDPOINTS = {
  forecasts: `${base}/forecasts`,
  inventoryAlerts: `${base}/inventory-alerts`,
  kpis: `${base}/kpis`,
  dataSources: `${base}/data-sources`,
  optimizationScenarios: `${base}/optimization-scenarios`,
  inventoryOptimizations: `${base}/inventory-optimizations`,
  alerts: `${base}/alerts`,
  metrics: `${base}/metrics`,
  reports: `${base}/reports`,
  analyticsInsights: `${base}/analytics-insights`,
  accessControls: `${base}/access-controls`,
  governanceMetrics: `${base}/governance-metrics`,
  biasDetections: `${base}/bias-detections`,
  sagemakerInference: `${base}/sagemaker/inference`,
} as const;
