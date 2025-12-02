'use client';

import { useRouter } from 'next/navigation';

interface SuccessModalProps {
  isOpen: boolean;
  onClose?: () => void; // Optional, as we might not want it to be closable via props in this specific use case, but good for flexibility
}

export default function SuccessModal({ isOpen }: SuccessModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 backdrop-blur-sm p-4 md:inset-0 h-modal md:h-full">
      <div className="relative w-full max-w-md h-full md:h-auto">
        {/* Modal content */}
        <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
          {/* Modal header - Removed close button to enforce persistence */}
          <div className="flex justify-center p-5 rounded-t border-b dark:border-gray-600">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">Registration Successful</h3>
          </div>
          {/* Modal body */}
          <div className="p-6 space-y-6">
            <p className="text-base leading-relaxed text-gray-500 dark:text-gray-400 text-center">Please check your email to confirm your account.</p>
          </div>
          {/* Modal footer */}
          <div className="flex items-center justify-center p-6 space-x-2 rounded-b border-t border-gray-200 dark:border-gray-600">
            <button onClick={() => router.push('/login')} type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
