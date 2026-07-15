import { AWS_CONFIG } from '../config/aws';

/**
 * Cognito authentication over the Cognito IDP JSON API (no SDK dependency).
 *
 * Uses USER_PASSWORD_AUTH for sign-in and REFRESH_TOKEN_AUTH for silent
 * renewal; both flows must be enabled on the user pool client (they are, in
 * aws/cloudformation/cognito.yaml). Tokens are kept in localStorage — an
 * accepted tradeoff for this SPA; a stricter posture would move tokens into
 * httpOnly cookies behind a small backend-for-frontend.
 */

const IDP_TARGET = 'AWSCognitoIdentityProviderService';
const STORAGE_KEY = 'timewise.auth';
const EXPIRY_MARGIN_MS = 60_000; // refresh one minute before expiry

interface StoredTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  username: string;
}

export interface NewPasswordChallenge {
  challenge: 'NEW_PASSWORD_REQUIRED';
  session: string;
  username: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

interface CognitoAuthResult {
  AuthenticationResult?: {
    IdToken: string;
    AccessToken: string;
    RefreshToken?: string;
    ExpiresIn: number;
  };
  ChallengeName?: string;
  Session?: string;
}

class AuthService {
  private refreshPromise: Promise<StoredTokens | null> | null = null;

  isConfigured(): boolean {
    return Boolean(AWS_CONFIG.auth.userPoolId && AWS_CONFIG.auth.clientId);
  }

  isAuthenticated(): boolean {
    return this.load() !== null;
  }

  currentUser(): string | null {
    return this.load()?.username ?? null;
  }

  private endpoint(): string {
    return `https://cognito-idp.${AWS_CONFIG.region}.amazonaws.com/`;
  }

  private async call<T>(action: string, payload: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `${IDP_TARGET}.${action}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = (body.__type ?? 'AuthError').split('#').pop();
      throw new AuthError(body.message ?? `Authentication failed (${code})`, code);
    }
    return body as T;
  }

  async signIn(username: string, password: string): Promise<StoredTokens | NewPasswordChallenge> {
    const result = await this.call<CognitoAuthResult>('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: AWS_CONFIG.auth.clientId,
      AuthParameters: { USERNAME: username, PASSWORD: password },
    });

    if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED' && result.Session) {
      return { challenge: 'NEW_PASSWORD_REQUIRED', session: result.Session, username };
    }
    if (!result.AuthenticationResult) {
      throw new AuthError(`Unsupported challenge: ${result.ChallengeName}`, 'UnsupportedChallenge');
    }
    return this.store(username, result.AuthenticationResult);
  }

  async completeNewPassword(
    challenge: NewPasswordChallenge,
    newPassword: string,
  ): Promise<StoredTokens> {
    const result = await this.call<CognitoAuthResult>('RespondToAuthChallenge', {
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      ClientId: AWS_CONFIG.auth.clientId,
      Session: challenge.session,
      ChallengeResponses: { USERNAME: challenge.username, NEW_PASSWORD: newPassword },
    });
    if (!result.AuthenticationResult) {
      throw new AuthError('Password update did not complete', 'ChallengeFailed');
    }
    return this.store(challenge.username, result.AuthenticationResult);
  }

  /**
   * Returns a valid ID token for API calls, silently refreshing when close to
   * expiry. Returns null when auth is unconfigured (demo mode) or signed out.
   */
  async getIdToken(): Promise<string | null> {
    if (!this.isConfigured()) return null;
    const tokens = this.load();
    if (!tokens) return null;

    if (Date.now() < tokens.expiresAt - EXPIRY_MARGIN_MS) {
      return tokens.idToken;
    }

    // Deduplicate concurrent refreshes across parallel polling hooks.
    this.refreshPromise ??= this.refresh(tokens).finally(() => {
      this.refreshPromise = null;
    });
    const refreshed = await this.refreshPromise;
    return refreshed?.idToken ?? null;
  }

  private async refresh(tokens: StoredTokens): Promise<StoredTokens | null> {
    try {
      const result = await this.call<CognitoAuthResult>('InitiateAuth', {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: AWS_CONFIG.auth.clientId,
        AuthParameters: { REFRESH_TOKEN: tokens.refreshToken },
      });
      if (!result.AuthenticationResult) return null;
      // Refresh responses omit the refresh token; keep the existing one.
      return this.store(tokens.username, {
        ...result.AuthenticationResult,
        RefreshToken: result.AuthenticationResult.RefreshToken ?? tokens.refreshToken,
      });
    } catch {
      this.signOut(); // refresh token revoked or expired: force re-login
      return null;
    }
  }

  async signOut(): Promise<void> {
    const tokens = this.load();
    localStorage.removeItem(STORAGE_KEY);
    if (tokens) {
      // Best-effort server-side revocation of the refresh token.
      try {
        await this.call('RevokeToken', {
          ClientId: AWS_CONFIG.auth.clientId,
          Token: tokens.refreshToken,
        });
      } catch {
        // Local sign-out already succeeded; revocation failures are non-fatal.
      }
    }
  }

  private store(
    username: string,
    auth: NonNullable<CognitoAuthResult['AuthenticationResult']>,
  ): StoredTokens {
    const tokens: StoredTokens = {
      idToken: auth.IdToken,
      accessToken: auth.AccessToken,
      refreshToken: auth.RefreshToken ?? '',
      expiresAt: Date.now() + auth.ExpiresIn * 1000,
      username,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    return tokens;
  }

  private load(): StoredTokens | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const tokens = JSON.parse(raw) as StoredTokens;
      return tokens.idToken && tokens.refreshToken ? tokens : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}

export const authService = new AuthService();
