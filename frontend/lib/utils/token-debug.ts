/**
 * トークン管理のデバッグユーティリティ
 * ブラウザコンソールから実行可能
 */

import { useAuthStore } from '@/stores/auth';
import { setCookie, getCookie, deleteCookie } from '@/lib/utils/cookies';
import { client } from '@/lib/api/client';

export const tokenDebug = {
  /**
   * 現在のトークン状態を表示
   */
  status: () => {
    const state = useAuthStore.getState();
    const accessTokenCookie = getCookie('access_token');
    const refreshTokenCookie = getCookie('refresh_token');
    
    console.table({
      'ログイン状態': state.isAuthenticated ? '✅ Yes' : '❌ No',
      'アクセストークン': state.accessToken ? `✅ ${state.accessToken.substring(0, 20)}...` : '❌ None',
      'リフレッシュトークン': state.refreshToken ? `✅ ${state.refreshToken.substring(0, 20)}...` : '❌ None',
      'トークン期限': state.refreshTokenExpiresAt 
        ? new Date(state.refreshTokenExpiresAt).toLocaleString('ja-JP')
        : 'N/A',
      'リフレッシュ不要': !state.shouldRefreshToken() ? '✅ OK' : '⚠️ Need Refresh',
    });
  },

  /**
   * アクセストークンを期限切れにする（401エラーを発生させる）
   */
  expireAccessToken: () => {
    console.log('🔴 アクセストークンを期限切れにしています...');
    setCookie('access_token', 'expired_' + Date.now(), {
      maxAge: -1,
      path: '/',
      sameSite: 'Lax',
    });
    console.log('✅ アクセストークンを削除しました');
    console.log('💡 次の API リクエストで自動的に /api/auth/refresh が呼び出されます');
    tokenDebug.status();
  },

  /**
   * リフレッシュトークンを期限切れにする
   */
  expireRefreshToken: () => {
    console.log('🔴 リフレッシュトークンを期限切れにしています...');
    deleteCookie('refresh_token', '/');
    useAuthStore.getState().logout();
    console.log('✅ リフレッシュトークンを削除し、ログアウトしました');
    tokenDebug.status();
  },

  /**
   * リフレッシュトークンの残り時間を1日以下にする（自動リフレッシュをトリガー）
   */
  makeRefreshTokenExpireSoon: () => {
    console.log('⏰ リフレッシュトークンの残り時間を23時間59分に設定しています...');
    const state = useAuthStore.getState();
    
    if (!state.refreshToken) {
      console.error('❌ リフレッシュトークンが存在しません');
      return;
    }
    
    // 残り時間を23時間59分に設定
    const newExpiresAt = Date.now() + (23 * 60 * 60 * 1000) + (59 * 60 * 1000);
    useAuthStore.setState({ refreshTokenExpiresAt: newExpiresAt });
    
    console.log('✅ リフレッシュトークンの期限を設定しました');
    console.log(`⏰ 新しい期限: ${new Date(newExpiresAt).toLocaleString('ja-JP')}`);
    console.log('💡 TokenRefreshManager が定期的にチェックして自動リフレッシュします');
    tokenDebug.status();
  },

  /**
   * 手動でトークンをリフレッシュ
   */
  refreshNow: async () => {
    console.log('🔄 トークンを手動でリフレッシュしています...');
    try {
      const result = await useAuthStore.getState().refreshAccessToken();
      if (result) {
        console.log('✅ トークンをリフレッシュしました');
        tokenDebug.status();
      } else {
        console.error('❌ トークンのリフレッシュに失敗しました');
      }
    } catch (error) {
      console.error('❌ エラー:', error);
    }
  },

  /**
   * ユーザーをログアウト
   */
  logout: () => {
    console.log('🚪 ログアウトしています...');
    useAuthStore.getState().logout();
    console.log('✅ ログアウトしました');
    tokenDebug.status();
  },

  /**
   * テスト用のシナリオ1: アクセストークン期限切れの自動リフレッシュをテスト
   */
  scenario1_AccessTokenExpiry: async () => {
    console.log('\n========== シナリオ1: アクセストークン期限切れ ==========');
    
    const state = useAuthStore.getState();
    if (!state.refreshToken) {
      console.error('❌ リフレッシュトークンが存在しません');
      console.log('💡 先にログインしてください！');
      return;
    }
    
    console.log('1️⃣  アクセストークンを期限切れにします');
    tokenDebug.expireAccessToken();
    
    console.log('\n2️⃣  API リクエストを送信します（自動リフレッシュがトリガーされます）');
    try {
      const response = await client.get('/api/users/me');
      console.log('✅ API リクエスト成功:', response);
      console.log('🎉 自動リフレッシュが機能しました！');
    } catch (error) {
      console.log('❌ API リクエスト失敗:', error);
      console.log('⚠️  リフレッシュトークンが有効か確認してください');
      console.log('💡 ページをリロードしてからもう一度試してください');
    }
    
    tokenDebug.status();
  },

  /**
   * テスト用のシナリオ3: リフレッシュトークン期限切れ
   */
  scenario2_RefreshTokenExpiry: async () => {
    console.log('\n========== シナリオ2: リフレッシュトークン期限切れ ==========');
    console.log('1️⃣  リフレッシュトークンを期限切れにします');
    tokenDebug.expireRefreshToken();
    
    console.log('\n2️⃣  API リクエストを送信します（ログアウトされるはずです）');
    try {
      const response = await client.get('/api/users/me');
      console.log('❌ 予期しない成功:', response);
    } catch (error) {
      console.log('✅ 予期通りエラーが発生:', error);
      console.log('🎉 リフレッシュトークン期限切れが正しく処理されました！');
    }
    
    tokenDebug.status();
  },

  /**
   * テスト用のシナリオ3: リフレッシュトークン自動更新
   */
  scenario3_AutoRefreshToken: async () => {
    console.log('\n========== シナリオ3: リフレッシュトークン自動更新 ==========');
    
    const state = useAuthStore.getState();
    if (!state.refreshToken) {
      console.error('❌ リフレッシュトークンが存在しません');
      console.log('💡 先にログインしてください！');
      console.log('   手順: ブラウザでログイン → await tokenDebug.scenario3_AutoRefreshToken() を実行');
      return;
    }
    
    console.log('1️⃣  リフレッシュトークンの残り時間を1日以下に設定します');
    tokenDebug.makeRefreshTokenExpireSoon();
    
    console.log('\n2️⃣  TokenRefreshManager が定期的にチェックします（テスト環境では10秒ごと）');
    console.log('💡 コンソールに「🔄 リフレッシュトークンの期限が近いため...」というメッセージが表示されたらOK');
    console.log('⏰ または 10秒待ってから tokenDebug.status() で確認してください');
    
    tokenDebug.status();
  },

  /**
   * すべてのデバッグ関数を一覧表示
   */
  help: () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║         トークン管理デバッグユーティリティ                    ║
╚════════════════════════════════════════════════════════════════╝

【状態確認】
  tokenDebug.status()
    → 現在のトークン状態を表示

【手動操作】
  tokenDebug.refreshNow()
    → トークンを手動でリフレッシュ
  
  tokenDebug.logout()
    → ログアウト

【期限切れシミュレーション】
  tokenDebug.expireAccessToken()
    → アクセストークンを期限切れに（自動リフレッシュがトリガー）
  
  tokenDebug.expireRefreshToken()
    → リフレッシュトークンを期限切れに（ログアウト）
  
  tokenDebug.makeRefreshTokenExpireSoon()
    → リフレッシュトークンの残り時間を1日以下に設定

【テストシナリオ】
  await tokenDebug.scenario1_AccessTokenExpiry()
    → アクセストークン期限切れの自動リフレッシュをテスト
  
  await tokenDebug.scenario2_RefreshTokenExpiry()
    → リフレッシュトークン期限切れをテスト
  
  await tokenDebug.scenario3_AutoRefreshToken()
    → リフレッシュトークン自動更新をテスト

例：
  console.log('Current status:');
  tokenDebug.status();
  
  console.log('Expire access token and trigger refresh:');
  await tokenDebug.scenario1_AccessTokenExpiry();
    `);
  },
};

// グローバルに公開（開発環境のみ）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).tokenDebug = tokenDebug;
  console.log('✅ トークンデバッグユーティリティが有効です');
  console.log('💡 コンソールで tokenDebug.help() を実行してください');
}

export default tokenDebug;
