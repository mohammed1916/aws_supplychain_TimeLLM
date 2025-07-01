import { API_ENDPOINTS } from '../config/aws';

class ApiService {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Forecast Data
  async getForecasts() {
    return this.fetchWithAuth(API_ENDPOINTS.forecasts);
  }

  async updateForecast(forecastId: string, data: any) {
    return this.fetchWithAuth(`${API_ENDPOINTS.forecasts}/${forecastId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Inventory Alerts
  async getInventoryAlerts() {
    return this.fetchWithAuth(API_ENDPOINTS.inventoryAlerts);
  }

  async acknowledgeAlert(alertId: string) {
    return this.fetchWithAuth(`${API_ENDPOINTS.inventoryAlerts}/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  // KPIs
  async getKPIs() {
    return this.fetchWithAuth(API_ENDPOINTS.kpis);
  }

  // Data Sources
  async getDataSources() {
    return this.fetchWithAuth(API_ENDPOINTS.dataSources);
  }

  async updateDataSource(sourceId: string, data: any) {
    return this.fetchWithAuth(`${API_ENDPOINTS.dataSources}/${sourceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Optimization Scenarios
  async getOptimizationScenarios() {
    return this.fetchWithAuth(API_ENDPOINTS.optimizationScenarios);
  }

  async runOptimization(scenarioId: string) {
    return this.fetchWithAuth(`${API_ENDPOINTS.optimizationScenarios}/${scenarioId}/run`, {
      method: 'POST',
    });
  }

  // Inventory Optimizations
  async getInventoryOptimizations() {
    return this.fetchWithAuth(API_ENDPOINTS.inventoryOptimizations);
  }

  async applyOptimization(optimizationId: string) {
    return this.fetchWithAuth(`${API_ENDPOINTS.inventoryOptimizations}/${optimizationId}/apply`, {
      method: 'POST',
    });
  }

  // Alerts
  async getAlerts() {
    return this.fetchWithAuth(API_ENDPOINTS.alerts);
  }

  async acknowledgeAlert(alertId: string) {
    return this.fetchWithAuth(`${API_ENDPOINTS.alerts}/${alertId}/acknowledge`, {
      method: 'POST',
    });
  }

  // Metrics
  async getMetrics() {
    return this.fetchWithAuth(API_ENDPOINTS.metrics);
  }

  // Reports
  async getReports() {
    return this.fetchWithAuth(API_ENDPOINTS.reports);
  }

  async generateReport(reportId: string) {
    return this.fetchWithAuth(`${API_ENDPOINTS.reports}/${reportId}/generate`, {
      method: 'POST',
    });
  }

  // Analytics Insights
  async getAnalyticsInsights() {
    return this.fetchWithAuth(API_ENDPOINTS.analyticsInsights);
  }

  // Access Controls
  async getAccessControls() {
    return this.fetchWithAuth(API_ENDPOINTS.accessControls);
  }

  async updateUserAccess(userId: string, permissions: string[]) {
    return this.fetchWithAuth(`${API_ENDPOINTS.accessControls}/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  }

  // Governance Metrics
  async getGovernanceMetrics() {
    return this.fetchWithAuth(API_ENDPOINTS.governanceMetrics);
  }

  // Bias Detections
  async getBiasDetections() {
    return this.fetchWithAuth(API_ENDPOINTS.biasDetections);
  }

  // SageMaker Inference
  async runSageMakerInference(inputData: any) {
    return this.fetchWithAuth(API_ENDPOINTS.sagemakerInference, {
      method: 'POST',
      body: JSON.stringify(inputData),
    });
  }
}

export const apiService = new ApiService();