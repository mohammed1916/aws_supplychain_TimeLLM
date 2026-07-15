// Domain models shared between the API client, hooks, and components.
// Shapes mirror the DynamoDB items returned by the Lambda services.

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type AlertCategory = 'inventory' | 'demand' | 'supply' | 'security' | 'system';

export interface ForecastPrediction {
  period: string;
  demand: number;
  lower: number;
  upper: number;
}

export interface Forecast {
  forecastId: string;
  productId: string;
  predictions: ForecastPrediction[];
  confidence: number;
  accuracy?: number;
  modelVersion: string;
  status: 'active' | 'superseded' | 'archived';
  createdAt: string;
  updatedAt?: string;
}

export interface Alert {
  alertId: string;
  type: 'info' | 'warning' | 'critical';
  category: AlertCategory;
  title: string;
  message: string;
  timestamp: string;
  source: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  actionRequired: boolean;
  metadata?: Record<string, unknown>;
}

export interface InventoryAlert {
  alertId: string;
  productId: string;
  product: string;
  status: 'overstock' | 'reorder' | 'optimal';
  quantity: number;
  threshold: number;
  severity: Severity;
  acknowledged: boolean;
  createdAt: string;
}

export interface KPI {
  kpiId: string;
  timestamp: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}

export interface DataSource {
  sourceId: string;
  name: string;
  sourceType: 'S3' | 'Kinesis' | 'RDS' | 'API';
  status: 'active' | 'processing' | 'error' | 'idle';
  lastSync: string;
  recordsProcessed: number;
  dataQuality: number;
}

export interface OptimizationScenario {
  scenarioId: string;
  name: string;
  description: string;
  scenarioType: 'route' | 'warehouse' | 'inventory' | 'cost';
  status: 'draft' | 'queued' | 'running' | 'completed' | 'failed';
  lastRunId?: string;
  lastRunAt?: string;
  results?: Record<string, unknown>;
  updatedAt: string;
}

export interface InventoryOptimization {
  optimizationId: string;
  productId: string;
  recommendation: string;
  currentLevel: number;
  recommendedLevel: number;
  projectedSavings: number;
  status: 'proposed' | 'applied' | 'dismissed';
  createdAt: string;
  appliedAt?: string;
}

export interface MetricPoint {
  metricId: string;
  timestamp: string;
  name: string;
  value: number;
  unit: string;
}

export interface Report {
  reportId: string;
  title: string;
  reportType: 'operational' | 'executive' | 'compliance';
  status: 'ready' | 'generating' | 'failed';
  createdAt: string;
  generatedAt?: string;
  downloadUrl?: string;
}

export interface AnalyticsInsight {
  insightId: string;
  category: string;
  title: string;
  summary: string;
  impact: Severity;
  recommendation: string;
  createdAt: string;
}

export interface AccessControl {
  userId: string;
  name: string;
  role: string;
  department: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  lastAccess: string;
}

export interface GovernanceMetric {
  metricId: string;
  timestamp: string;
  name: string;
  value: number;
  threshold: number;
  status: 'compliant' | 'warning' | 'violation';
  description: string;
}

export interface BiasDetection {
  detectionId: string;
  modelComponent: string;
  biasType: string;
  severity: Severity;
  status: 'detected' | 'mitigating' | 'resolved';
  mitigation: string;
  detectedAt: string;
}

// Response envelopes returned by the Lambda services.

export interface ListResponse<T> {
  items: T[];
  count: number;
  nextToken?: string;
}

export type ForecastsResponse = ListResponse<Forecast>;
export interface AlertsResponse extends ListResponse<Alert> {
  unacknowledged: number;
}
export type InventoryAlertsResponse = ListResponse<InventoryAlert>;

export interface InferenceRequest {
  historicalData: Array<{ period: string; demand: number }>;
  forecastHorizon: number;
  productId: string;
  externalFactors?: Record<string, unknown>;
}

export interface InferenceResponse {
  predictions: ForecastPrediction[];
  confidence: number;
  modelVersion: string;
}
