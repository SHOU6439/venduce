'use client';

import { apiClient } from '@/lib/api/client';
import { useEffect, useState } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
}

export default function SuccessModal({ isOpen, email, onClose }: SuccessModalProps) {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const storedExpiresAt = localStorage.getItem('resend_cooldown_expires_at');
    if (storedExpiresAt) {
      const expiresAt = parseInt(storedExpiresAt, 10);
      const now = Date.now();
      const remaining = Math.ceil((expiresAt - now) / 1000);
      if (remaining > 0) {
        setCountdown(remaining);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleResend = async () => {
    setIsResending(true);
    setMessage(null);

    try {
      await apiClient.post('/auth/resend-confirmation', { email });
      setMessage('確認メールを再送信しました。');

      const storedRetryCount = parseInt(localStorage.getItem('resend_retry_count') || '0', 10);
      const nextRetryCount = storedRetryCount + 1;
      const waitTime = 15 * Math.pow(2, storedRetryCount);

      const expiresAt = Date.now() + waitTime * 1000;

      localStorage.setItem('resend_retry_count', nextRetryCount.toString());
      localStorage.setItem('resend_cooldown_expires_at', expiresAt.toString());

      setCountdown(waitTime);
    } catch {
      setMessage('再送信に失敗しました。しばらく待ってから再度お試しください。');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 backdrop-blur-sm p-4 md:inset-0 h-modal md:h-full">
      <div className="relative w-full max-w-md h-full md:h-auto">
        {/* Modal content */}
        <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
          <button type="button" className="absolute top-3 right-3 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white" onClick={onClose}>
            <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
            <span className="sr-only">Close modal</span>
          </button>
          {/* Modal header */}
          <div className="flex justify-center p-5 rounded-t border-b dark:border-gray-600">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">会員登録完了</h3>
          </div>
          {/* Modal body */}
          <div className="p-6 space-y-6">
            <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400 text-center">
              ご登録ありがとうございます。
              <br />
              確認メールを送信しましたので、メール内のリンクからアカウントを有効化してください。
            </p>
            {message && <p className={`text-sm text-center ${message.includes('失敗') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
          </div>
          {/* Modal footer */}
          <div className="flex items-center justify-center p-6 space-x-2 rounded-b border-t border-gray-200 dark:border-gray-600">
            <button onClick={handleResend} type="button" disabled={isResending || countdown > 0} className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]">
              {isResending ? '送信中...' : countdown > 0 ? `再送信まで ${countdown}秒` : 'メールを再送信する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
