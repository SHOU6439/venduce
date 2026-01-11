import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * バックエンドのAssetオブジェクトまたはパスから完全な画像URLを生成する
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export function getImageUrl(pathOrUrl?: string): string {
  if (!pathOrUrl) return '/placeholder.svg';
  if (pathOrUrl.startsWith('http')) return pathOrUrl;

  // バックエンドが返す public_url が相対パスの場合 (/storage/...)
  // APIサーバーのベースURLを付与する
  return `${API_BASE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export function formatCurrencyFromMinorUnit(amountInMinor: number, currency = 'JPY'): string {
  const fractionDigits = currency === 'JPY' ? 0 : 2;
  const value = amountInMinor / 100;
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
