/// <reference types="vite/client" />
/// <reference types="node" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_BASE_URL: string;
  // 他の環境変数があれば追加
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 

