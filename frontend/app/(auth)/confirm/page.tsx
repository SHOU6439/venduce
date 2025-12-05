'use client';

import { apiClient, ApiError } from '@/lib/api/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid confirmation link.');
      return;
    }

    const confirmAccount = async () => {
      try {
        await apiClient.post(`/api/auth/confirm?token=${token}`);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('An unexpected error occurred during confirmation.');
        }
      }
    };

    confirmAccount();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 sm:p-10 transition-all duration-300 hover:shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-8">アカウント確認</h2>

          {status === 'verifying' && (
            <div className="flex flex-col items-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-6"></div>
              <p className="text-gray-600 font-medium">アカウントを確認中...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-4">
              <div className="h-16 w-16 text-green-500 mb-6 bg-green-50 rounded-full p-2">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-900 font-bold text-lg mb-2">確認完了</p>
              <p className="text-gray-600 mb-8">アカウントの確認が完了しました！</p>
              <Link href="/login" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:-translate-y-0.5">
                ログインページへ
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-4">
              <div className="h-16 w-16 text-red-500 mb-6 bg-red-50 rounded-full p-2">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-gray-900 font-bold text-lg mb-2">確認失敗</p>
              <p className="text-gray-500 text-sm mb-8">{errorMessage === 'Invalid confirmation link.' ? '無効な確認リンクです。' : errorMessage || '予期せぬエラーが発生しました。'}</p>
              <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-semibold hover:underline transition-colors">
                ログインページに戻る
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmContent />
    </Suspense>
  );
}
