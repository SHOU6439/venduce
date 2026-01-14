import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export function getImageUrl(pathOrUrl?: string): string {
  if (!pathOrUrl) return '/placeholder.svg';
  if (pathOrUrl.startsWith('http')) return pathOrUrl;

  return `${API_BASE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export function parseHashtags(text: string): string[] {
  const matches = text.match(/#[^\s#]+/g);
  return matches ? matches.map((tag) => tag.slice(1)) : [];
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
