/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Remove all VITE_FIREBASE_... variables
  // readonly VITE_FIREBASE_API_KEY: string;
  // readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  // readonly VITE_FIREBASE_PROJECT_ID: string;
  // readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  // readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  // readonly VITE_FIREBASE_APP_ID: string;

  // Add these
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}