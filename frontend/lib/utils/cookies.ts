/**
 * Cookie utilities
 */

export function setCookie(name: string, value: string, options?: { maxAge?: number; path?: string; sameSite?: 'Strict' | 'Lax' | 'None'; secure?: boolean }): void {
  if (typeof window === 'undefined') return;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options?.maxAge) {
    cookieString += `; Max-Age=${options.maxAge}`;
  }

  if (options?.path) {
    cookieString += `; Path=${options.path}`;
  }

  if (options?.sameSite) {
    cookieString += `; SameSite=${options.sameSite}`;
  }

  if (options?.secure) {
    cookieString += '; Secure';
  }

  document.cookie = cookieString;
}

export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;

  const nameEQ = encodeURIComponent(name) + '=';
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(nameEQ)) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }

  return null;
}

export function deleteCookie(name: string, path?: string): void {
  if (typeof window === 'undefined') return;

  let cookieString = `${encodeURIComponent(name)}=; Max-Age=0`;
  if (path) {
    cookieString += `; Path=${path}`;
  }

  document.cookie = cookieString;
}
