import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/apiService';

interface UseApiDataOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

const MAX_BACKOFF_MS = 300_000; // cap error backoff at 5 minutes

/**
 * Generic polling hook.
 *
 * Production behaviors:
 * - Pauses polling while the tab is hidden and refreshes immediately on return,
 *   so idle dashboards don't generate API traffic.
 * - Backs off exponentially after consecutive failures (interval x 2^errors,
 *   capped at 5 minutes) instead of hammering a failing endpoint.
 * - Ignores stale responses after unmount to avoid setState-after-unmount leaks.
 */
export function useApiData<T>(
  apiCall: () => Promise<T>,
  dependencies: unknown[] = [],
  options: UseApiDataOptions = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { refreshInterval = 30_000, autoRefresh = true } = options;

  const mountedRef = useRef(true);
  const errorCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiCallRef = useRef(apiCall);
  apiCallRef.current = apiCall;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiCallRef.current();
      if (!mountedRef.current) return;
      setData(result);
      setError(null);
      setLastUpdated(new Date());
      errorCountRef.current = 0;
    } catch (err) {
      if (!mountedRef.current) return;
      errorCountRef.current += 1;
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (!autoRefresh || refreshInterval <= 0) return;
    const backoff = Math.min(refreshInterval * 2 ** errorCountRef.current, MAX_BACKOFF_MS);
    timerRef.current = setTimeout(async () => {
      if (document.visibilityState === 'visible') {
        await fetchData();
      }
      scheduleNext();
    }, backoff);
  }, [autoRefresh, refreshInterval, fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData().then(scheduleNext);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
  };
}

// Domain hooks. Polling cadence is tiered by data criticality:
// operational alerts poll fastest, generated reports slowest.

export function useForecasts() {
  return useApiData(() => apiService.getForecasts(), [], { refreshInterval: 60_000 });
}

export function useInventoryAlerts() {
  return useApiData(() => apiService.getInventoryAlerts(), [], { refreshInterval: 10_000 });
}

export function useKPIs() {
  return useApiData(() => apiService.getKPIs(), [], { refreshInterval: 30_000 });
}

export function useDataSources() {
  return useApiData(() => apiService.getDataSources(), [], { refreshInterval: 15_000 });
}

export function useOptimizationScenarios() {
  return useApiData(() => apiService.getOptimizationScenarios(), [], { refreshInterval: 120_000 });
}

export function useInventoryOptimizations() {
  return useApiData(() => apiService.getInventoryOptimizations(), [], { refreshInterval: 60_000 });
}

export function useAlerts() {
  return useApiData(() => apiService.getAlerts(), [], { refreshInterval: 5_000 });
}

export function useMetrics() {
  return useApiData(() => apiService.getMetrics(), [], { refreshInterval: 10_000 });
}

export function useReports() {
  return useApiData(() => apiService.getReports(), [], { refreshInterval: 300_000 });
}

export function useAnalyticsInsights() {
  return useApiData(() => apiService.getAnalyticsInsights(), [], { refreshInterval: 180_000 });
}

export function useAccessControls() {
  return useApiData(() => apiService.getAccessControls(), [], { refreshInterval: 60_000 });
}

export function useGovernanceMetrics() {
  return useApiData(() => apiService.getGovernanceMetrics(), [], { refreshInterval: 30_000 });
}

export function useBiasDetections() {
  return useApiData(() => apiService.getBiasDetections(), [], { refreshInterval: 60_000 });
}
