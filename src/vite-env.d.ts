/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYLOAD_ENCRYPTION_KEY: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
