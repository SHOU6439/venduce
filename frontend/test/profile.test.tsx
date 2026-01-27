import { render, screen, waitFor } from '@testing-library/react';
import ProfilePage from '@/app/profile/page';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import { vi, describe, it, beforeEach, afterEach, expect, Mock } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}));

describe('ProfilePage', () => {
  const mockPush = vi.fn();
  const mockRefresh = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({ push: mockPush, refresh: mockRefresh });
    (useAuthStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      // hydrated & authenticated by default
      return selector({
        isAuthenticated: true,
        hasHydrated: true,
        logout: mockLogout,
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders profile page when authenticated and hydrated', async () => {
    render(<ProfilePage />);
    await waitFor(() => {
      expect(screen.getByText(/プロフィールを読み込み中です|プロフィール情報が見つかりません|プロフィール/i)).toBeDefined();
    });
  });

  it('does not render when not hydrated', async () => {
    (useAuthStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector({
        isAuthenticated: true,
        hasHydrated: false,
        logout: mockLogout,
      });
    });
    render(<ProfilePage />);
    expect(screen.queryByText(/プロフィール/)).toBeNull();
  });

  it('redirects to login when not authenticated after hydration', async () => {
    (useAuthStore as unknown as Mock).mockImplementation((selector: (state: any) => any) => {
      return selector({
        isAuthenticated: false,
        hasHydrated: true,
        logout: mockLogout,
      });
    });
    render(<ProfilePage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
