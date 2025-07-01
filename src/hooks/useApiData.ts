import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';

interface UseApiDataOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export function useApiData<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  options: UseApiDataOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { refreshInterval = 30000, autoRefresh = true } = options;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('API call failed:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh, refreshInterval]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}

// Specific hooks for different data types
export function useForecasts() {
  return useApiData(() => apiService.getForecasts(), [], { refreshInterval: 60000 });
}

export function useInventoryAlerts() {
  return useApiData(() => apiService.getInventoryAlerts(), [], { refreshInterval: 10000 });
}

export function useKPIs() {
  return useApiData(() => apiService.getKPIs(), [], { refreshInterval: 30000 });
}

export function useDataSources() {
  return useApiData(() => apiService.getDataSources(), [], { refreshInterval: 15000 });
}

export function useOptimizationScenarios() {
  return useApiData(() => apiService.getOptimizationScenarios(), [], { refreshInterval: 120000 });
}

export function useInventoryOptimizations() {
  return useApiData(() => apiService.getInventoryOptimizations(), [], { refreshInterval: 60000 });
}

export function useAlerts() {
  return useApiData(() => apiService.getAlerts(), [], { refreshInterval: 5000 });
}

export function useMetrics() {
  return useApiData(() => apiService.getMetrics(), [], { refreshInterval: 10000 });
}

export function useReports() {
  return useApiData(() => apiService.getReports(), [], { refreshInterval: 300000 });
}

export function useAnalyticsInsights() {
  return useApiData(() => apiService.getAnalyticsInsights(), [], { refreshInterval: 180000 });
}

export function useAccessControls() {
  return useApiData(() => apiService.getAccessControls(), [], { refreshInterval: 60000 });
}

export function useGovernanceMetrics() {
  return useApiData(() => apiService.getGovernanceMetrics(), [], { refreshInterval: 30000 });
}

export function useBiasDetections() {
  return useApiData(() => apiService.getBiasDetections(), [], { refreshInterval: 60000 });
}