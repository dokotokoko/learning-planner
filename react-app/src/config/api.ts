/**
 * API設定
 * 環境に応じて適切なAPIベースURLを提供
 */

// 環境変数からAPI URLを取得、デフォルトは相対パス
const VITE_API_URL = import.meta.env.VITE_API_URL;

// APIベースURLを決定
// - 環境変数が設定されていればそれを使用
// - 設定されていなければ相対パス（同一オリジン）を使用
export const API_BASE_URL = VITE_API_URL || '/api';

// APIエンドポイントのヘルパー関数
export const getApiUrl = (endpoint: string): string => {
  // endpointが/で始まる場合は除去
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // APIベースURLが相対パスの場合
  if (API_BASE_URL.startsWith('/')) {
    return `${API_BASE_URL}/${cleanEndpoint}`;
  }
  
  // APIベースURLが絶対URLの場合
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// デバッグ用ログ（開発環境のみ）
if (import.meta.env.DEV) {
  console.log('API Configuration:', {
    VITE_API_URL,
    API_BASE_URL,
    isRelativePath: API_BASE_URL.startsWith('/')
  });
}