import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Tests for <AuthGate /> — the single point that decides what users
 * see based on their auth state.
 *
 * Four mutually-exclusive UI states are covered:
 *   1. loading  → spinner + "Loading..." text
 *   2. signed out → <LoginScreen />
 *   3. signed in, NOT on allowlist → "Access Denied" with the offending email
 *   4. signed in, on allowlist → renders children
 *
 * useAuth is mocked at the module level so we control state per test.
 * LoginScreen is also mocked to avoid pulling the real Supabase form.
 */

const signOutMock = vi.fn();

const useAuthMock = vi.fn();

vi.mock('@/components/auth-provider', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/components/login-screen', () => ({
  LoginScreen: () => <div data-testid="login-screen">Login Screen</div>,
}));

import { AuthGate } from '@/components/auth-gate';

function setAuthState(partial: {
  loading?: boolean;
  user?: { email: string } | null;
  isAdmin?: boolean;
}) {
  useAuthMock.mockReturnValue({
    user: partial.user ?? null,
    session: null,
    loading: partial.loading ?? false,
    isAdmin: partial.isAdmin ?? false,
    signIn: vi.fn(),
    signOut: signOutMock,
  });
}

describe('<AuthGate />', () => {
  test('loading state shows the spinner and "Loading..." text', () => {
    setAuthState({ loading: true });

    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-screen')).not.toBeInTheDocument();
  });

  test('signed-out state renders the login screen', () => {
    setAuthState({ user: null });

    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>,
    );

    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  test('signed-in but not-on-allowlist shows "Access Denied" with the email', () => {
    setAuthState({
      user: { email: 'outsider@example.com' },
      isAdmin: false,
    });

    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>,
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    // The user's email is shown so they understand who they're signed in as.
    expect(screen.getByText(/outsider@example\.com/i)).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  test('"Access Denied" sign-out button calls signOut', async () => {
    const user = userEvent.setup();
    setAuthState({
      user: { email: 'outsider@example.com' },
      isAdmin: false,
    });

    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>,
    );

    await user.click(screen.getByRole('button', { name: /sign out/i }));
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  test('signed-in and on-allowlist renders children', () => {
    setAuthState({
      user: { email: 'valdez@noviogroup.com' },
      isAdmin: true,
    });

    render(
      <AuthGate>
        <div>protected content</div>
      </AuthGate>,
    );

    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-screen')).not.toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });
});
