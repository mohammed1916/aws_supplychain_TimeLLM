/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AWS_REGION?: string;
  readonly VITE_API_GATEWAY_URL?: string;
  readonly VITE_COGNITO_USER_POOL_ID?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_ENABLE_REAL_TIME_UPDATES?: string;
  readonly VITE_ENABLE_ADVANCED_ANALYTICS?: string;
  readonly VITE_ENABLE_AI_INSIGHTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
