import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE = 'https://api.test.example.com/prod';

function mockFetch(payload: unknown, status = 200) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) =>
    new Response(JSON.stringify(payload), { status }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

async function loadApiService(withAuth = false) {
  vi.stubEnv('VITE_API_GATEWAY_URL', BASE);
  if (withAuth) {
    vi.stubEnv('VITE_AWS_REGION', 'us-east-1');
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_TEST');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'client-abc');
  }
  return import('./apiService');
}

describe('apiService', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('fails fast with a clear error when the API URL is unconfigured', async () => {
    vi.resetModules();
    const { apiService } = await import('./apiService');
    await expect(apiService.getAlerts()).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    });
  });

  it('builds list URLs with encoded query parameters', async () => {
    const fetchMock = mockFetch({ items: [], count: 0 });
    const { apiService } = await loadApiService();

    await apiService.getForecasts('SKU 100/HP');
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/forecasts?productId=SKU%20100%2FHP`);
  });

  it('acknowledges inventory alerts on the inventory-alerts resource', async () => {
    // Regression: this and acknowledgeAlert were once one duplicated method
    // that silently pointed both flows at /alerts.
    const fetchMock = mockFetch({ alert: {} });
    const { apiService } = await loadApiService();

    await apiService.acknowledgeInventoryAlert('ia-7');
    await apiService.acknowledgeAlert('a-9');
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/inventory-alerts/ia-7/acknowledge`);
    expect(fetchMock.mock.calls[1][0]).toBe(`${BASE}/alerts/a-9/acknowledge`);
  });

  it('maps non-2xx responses onto ApiError with status and body', async () => {
    mockFetch({ error: 'Forecast fc-1 not found' }, 404);
    const { apiService, ApiError } = await loadApiService();

    const failure = apiService.updateForecast('fc-1', { status: 'archived' });
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({
      status: 404,
      body: { error: 'Forecast fc-1 not found' },
    });
  });

  it('omits the Authorization header when signed out', async () => {
    const fetchMock = mockFetch({ items: [], count: 0 });
    const { apiService } = await loadApiService();

    await apiService.getKPIs();
    const headers = fetchMock.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('sends a bearer token when a Cognito session is active', async () => {
    localStorage.setItem(
      'timewise.auth',
      JSON.stringify({
        idToken: 'jwt-id-token',
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt: Date.now() + 3_600_000,
        username: 'user@example.com',
      }),
    );
    const fetchMock = mockFetch({ items: [], count: 0 });
    const { apiService } = await loadApiService(true);

    await apiService.getKPIs();
    const headers = fetchMock.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt-id-token');
  });

  it('sets a JSON content type only when a body is sent', async () => {
    const fetchMock = mockFetch({ scenario: {} });
    const { apiService } = await loadApiService();

    await apiService.runOptimization('sc-1');
    const postHeaders = fetchMock.mock.calls[0][1]!.headers as Record<string, string>;
    expect(postHeaders['Content-Type']).toBeUndefined();

    await apiService.updateDataSource('ds-1', { status: 'idle' });
    const putHeaders = fetchMock.mock.calls[1][1]!.headers as Record<string, string>;
    expect(putHeaders['Content-Type']).toBe('application/json');
  });
});
