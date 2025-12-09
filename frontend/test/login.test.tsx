import Login from '@/app/login/page';
import { useAuthStore } from '@/stores/auth';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

// Mock modules
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}));

describe('Login Page', () => {
  const mockLogin = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({ push: mockPush });
    (useAuthStore as unknown as Mock).mockImplementation((selector: (state: unknown) => unknown) => {
      if (selector) return selector({ login: mockLogin });
      return { login: mockLogin };
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders login form', () => {
    render(<Login />);
    expect(screen.getByLabelText(/メールアドレス/i)).toBeDefined();
    expect(screen.getByLabelText(/パスワード/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /サインイン/i })).toBeDefined();
  });

  it('shows validation errors for empty fields', () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /サインイン/i }));
    expect(screen.getByText(/メールアドレスを入力してください/i)).toBeDefined();
    expect(screen.getByText(/パスワードを入力してください/i)).toBeDefined();
  });

  it('calls login and redirects on success', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    render(<Login />);

    fireEvent.change(screen.getByLabelText(/メールアドレス/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/パスワード/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /サインイン/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password', remember: false });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message on failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Login failed'));
    render(<Login />);

    fireEvent.change(screen.getByLabelText(/メールアドレス/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/パスワード/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /サインイン/i }));

    await waitFor(() => {
      expect(screen.getByText(/予期せぬエラーが発生しました/i)).toBeDefined();
    });
  });
});
