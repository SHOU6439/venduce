'use client';

import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Login() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!formData.email) {
      errors.email = 'メールアドレスを入力してください';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }
    if (!formData.password) {
      errors.password = 'パスワードを入力してください';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setIsLoading(true);

    try {
      await login({ ...formData, remember: rememberMe });
      router.push('/');
    } catch (err) {
      if (err instanceof ApiError) {
        // Handle specific error codes if available, otherwise use message
        setError(err.message || 'ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      } else {
        setError('予期せぬエラーが発生しました。しばらくしてから再度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-50 via-white to-cyan-50 p-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 sm:p-10 transition-all duration-300 hover:shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">おかえりなさい</h1>
          <p className="text-sm text-gray-500">アカウントにサインインして続行してください</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md animate-pulse">
              <div className="flex">
                <div className="shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* メールアドレス入力 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <div className="relative">
              <input id="email" type="email" name="email" autoComplete="email" placeholder="name@company.com" className={`w-full px-4 py-3 bg-gray-50 border ${fieldErrors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`} value={formData.email} onChange={handleChange} disabled={isLoading} />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.email}</p>}
            </div>
          </div>

          {/* パスワード入力 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <Link href="/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                パスワードをお忘れですか？
              </Link>
            </div>
            <div className="relative">
              <input id="password" type="password" name="password" autoComplete="current-password" placeholder="••••••••" className={`w-full px-4 py-3 bg-gray-50 border ${fieldErrors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-indigo-500 focus:border-indigo-500'} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`} value={formData.password} onChange={handleChange} disabled={isLoading} />
              {fieldErrors.password && <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.password}</p>}
            </div>
          </div>

          {/* ログイン維持 & ボタン */}
          <div className="flex items-center">
            <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={isLoading} />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 cursor-pointer select-none">
              ログイン状態を維持する
            </label>
          </div>

          <button type="submit" className="w-full flex justify-center py-3 px-4 cursor-pointer border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5" disabled={isLoading}>
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : null}
            {isLoading ? 'サインイン中...' : 'サインイン'}
          </button>
        </form>

        {/* 会員登録リンク */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでないですか？{' '}
            <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors hover:underline">
              無料で登録する
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
