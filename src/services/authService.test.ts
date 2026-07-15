import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const AUTH_RESULT = {
  AuthenticationResult: {
    IdToken: 'id-token-1',
    AccessToken: 'access-token-1',
    RefreshToken: 'refresh-token-1',
    ExpiresIn: 3600,
  },
};

function mockFetch(payload: unknown, status = 200) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) =>
    new Response(JSON.stringify(payload), { status }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

async function loadAuthService(configured = true) {
  if (configured) {
    vi.stubEnv('VITE_AWS_REGION', 'us-east-1');
    vi.stubEnv('VITE_COGNITO_USER_POOL_ID', 'us-east-1_TEST');
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'client-abc');
  }
  const module = await import('./authService');
  return module;
}

describe('authService', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('is unconfigured without Cognito env vars and yields no token', async () => {
    const { authService } = await loadAuthService(false);
    expect(authService.isConfigured()).toBe(false);
    expect(await authService.getIdToken()).toBeNull();
  });

  it('signs in via USER_PASSWORD_AUTH and stores tokens', async () => {
    const fetchMock = mockFetch(AUTH_RESULT);
    const { authService } = await loadAuthService();

    const result = await authService.signIn('user@example.com', 'Password-123!');
    expect('challenge' in result).toBe(false);
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.currentUser()).toBe('user@example.com');
    expect(await authService.getIdToken()).toBe('id-token-1');

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.AuthFlow).toBe('USER_PASSWORD_AUTH');
    expect(body.ClientId).toBe('client-abc');
  });

  it('surfaces the NEW_PASSWORD_REQUIRED challenge', async () => {
    mockFetch({ ChallengeName: 'NEW_PASSWORD_REQUIRED', Session: 'sess-1' });
    const { authService } = await loadAuthService();

    const result = await authService.signIn('new@example.com', 'Temp-123!');
    expect(result).toMatchObject({ challenge: 'NEW_PASSWORD_REQUIRED', session: 'sess-1' });
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('maps Cognito error types onto AuthError codes', async () => {
    mockFetch(
      { __type: 'com.amazon#NotAuthorizedException', message: 'Incorrect username or password.' },
      400,
    );
    const { authService, AuthError } = await loadAuthService();

    await expect(authService.signIn('user@example.com', 'wrong')).rejects.toMatchObject({
      name: 'AuthError',
      code: 'NotAuthorizedException',
    });
    expect(AuthError).toBeDefined();
  });

  it('silently refreshes an expired token via REFRESH_TOKEN_AUTH', async () => {
    localStorage.setItem(
      'timewise.auth',
      JSON.stringify({
        idToken: 'stale-id',
        accessToken: 'stale-access',
        refreshToken: 'refresh-token-1',
        expiresAt: Date.now() - 1000,
        username: 'user@example.com',
      }),
    );
    const fetchMock = mockFetch({
      AuthenticationResult: { IdToken: 'fresh-id', AccessToken: 'fresh-access', ExpiresIn: 3600 },
    });
    const { authService } = await loadAuthService();

    expect(await authService.getIdToken()).toBe('fresh-id');
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.AuthFlow).toBe('REFRESH_TOKEN_AUTH');
    expect(body.AuthParameters.REFRESH_TOKEN).toBe('refresh-token-1');
    // Original refresh token is retained when the response omits one.
    expect(JSON.parse(localStorage.getItem('timewise.auth')!).refreshToken).toBe('refresh-token-1');
  });

  it('signs out locally and revokes the refresh token', async () => {
    const fetchMock = mockFetch(AUTH_RESULT);
    const { authService } = await loadAuthService();
    await authService.signIn('user@example.com', 'Password-123!');

    await authService.signOut();
    expect(authService.isAuthenticated()).toBe(false);
    const revoke = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect((revoke[1]!.headers as Record<string, string>)['X-Amz-Target']).toContain('RevokeToken');
  });
});
