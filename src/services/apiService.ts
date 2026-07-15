import { API_ENDPOINTS, isApiConfigured } from '../config/aws';
import type {
  AccessControl,
  Alert,
  AlertsResponse,
  AnalyticsInsight,
  BiasDetection,
  DataSource,
  Forecast,
  ForecastsResponse,
  GovernanceMetric,
  InferenceRequest,
  InferenceResponse,
  InventoryAlert,
  InventoryAlertsResponse,
  InventoryOptimization,
  KPI,
  ListResponse,
  MetricPoint,
  OptimizationScenario,
  Report,
} from '../types';

const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    if (!isApiConfigured()) {
      throw new ApiError('API Gateway URL is not configured (set VITE_API_GATEWAY_URL)', 0);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string>),
    };

    const token = localStorage.getItem('authToken');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers, signal: controller.signal });

      if (!response.ok) {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          body = undefined;
        }
        throw new ApiError(`${response.status} ${response.statusText}`, response.status, body);
      }

      if (response.status === 204) {
        return undefined as T;
      }
      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError(`Request timed out after ${REQUEST_TIMEOUT_MS} ms`, 0);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private get<T>(url: string): Promise<T> {
    return this.request<T>(url);
  }

  private post<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }

  private put<T>(url: string, body: unknown): Promise<T> {
    return this.request<T>(url, { method: 'PUT', body: JSON.stringify(body) });
  }

  // Forecasts
  getForecasts(productId?: string): Promise<ForecastsResponse> {
    const query = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    return this.get(`${API_ENDPOINTS.forecasts}${query}`);
  }

  createForecast(input: InferenceRequest): Promise<{ forecast: Forecast }> {
    return this.post(API_ENDPOINTS.forecasts, input);
  }

  updateForecast(forecastId: string, data: Partial<Pick<Forecast, 'status'>>): Promise<{ forecast: Forecast }> {
    return this.put(`${API_ENDPOINTS.forecasts}/${forecastId}`, data);
  }

  // Inventory alerts
  getInventoryAlerts(): Promise<InventoryAlertsResponse> {
    return this.get(API_ENDPOINTS.inventoryAlerts);
  }

  acknowledgeInventoryAlert(alertId: string): Promise<{ alert: InventoryAlert }> {
    return this.post(`${API_ENDPOINTS.inventoryAlerts}/${alertId}/acknowledge`);
  }

  // KPIs
  getKPIs(): Promise<ListResponse<KPI>> {
    return this.get(API_ENDPOINTS.kpis);
  }

  // Data sources
  getDataSources(): Promise<ListResponse<DataSource>> {
    return this.get(API_ENDPOINTS.dataSources);
  }

  updateDataSource(sourceId: string, data: Partial<DataSource>): Promise<{ dataSource: DataSource }> {
    return this.put(`${API_ENDPOINTS.dataSources}/${sourceId}`, data);
  }

  // Optimization scenarios
  getOptimizationScenarios(): Promise<ListResponse<OptimizationScenario>> {
    return this.get(API_ENDPOINTS.optimizationScenarios);
  }

  runOptimization(scenarioId: string): Promise<{ scenario: OptimizationScenario }> {
    return this.post(`${API_ENDPOINTS.optimizationScenarios}/${scenarioId}/run`);
  }

  // Inventory optimizations
  getInventoryOptimizations(): Promise<ListResponse<InventoryOptimization>> {
    return this.get(API_ENDPOINTS.inventoryOptimizations);
  }

  applyOptimization(optimizationId: string): Promise<{ optimization: InventoryOptimization }> {
    return this.post(`${API_ENDPOINTS.inventoryOptimizations}/${optimizationId}/apply`);
  }

  // Alerts
  getAlerts(category?: string): Promise<AlertsResponse> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.get(`${API_ENDPOINTS.alerts}${query}`);
  }

  createAlert(alert: Partial<Alert>): Promise<{ alert: Alert }> {
    return this.post(API_ENDPOINTS.alerts, alert);
  }

  acknowledgeAlert(alertId: string): Promise<{ alert: Alert }> {
    return this.post(`${API_ENDPOINTS.alerts}/${alertId}/acknowledge`);
  }

  // Metrics
  getMetrics(): Promise<ListResponse<MetricPoint>> {
    return this.get(API_ENDPOINTS.metrics);
  }

  // Reports
  getReports(): Promise<ListResponse<Report>> {
    return this.get(API_ENDPOINTS.reports);
  }

  generateReport(reportId: string): Promise<{ report: Report }> {
    return this.post(`${API_ENDPOINTS.reports}/${reportId}/generate`);
  }

  // Analytics insights
  getAnalyticsInsights(): Promise<ListResponse<AnalyticsInsight>> {
    return this.get(API_ENDPOINTS.analyticsInsights);
  }

  // Access controls
  getAccessControls(): Promise<ListResponse<AccessControl>> {
    return this.get(API_ENDPOINTS.accessControls);
  }

  updateUserAccess(userId: string, permissions: string[]): Promise<{ accessControl: AccessControl }> {
    return this.put(`${API_ENDPOINTS.accessControls}/${userId}`, { permissions });
  }

  // Governance
  getGovernanceMetrics(): Promise<ListResponse<GovernanceMetric>> {
    return this.get(API_ENDPOINTS.governanceMetrics);
  }

  getBiasDetections(): Promise<ListResponse<BiasDetection>> {
    return this.get(API_ENDPOINTS.biasDetections);
  }

  // Direct SageMaker inference (proxied through the forecasts service)
  runSageMakerInference(input: InferenceRequest): Promise<InferenceResponse> {
    return this.post(API_ENDPOINTS.sagemakerInference, input);
  }
}

export const apiService = new ApiService();
