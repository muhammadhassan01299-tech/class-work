import { api } from './api';

/**
 * Customer accounts live on the server (passwords are hashed there) and the browser
 * only keeps an httpOnly session cookie. There are NO admin credentials in this bundle:
 * the admin signs in at /admin and is verified by the server against the .env file.
 */
export interface AuthSession {
  username: string;
  displayName: string;
  email: string;
  role: 'user';
  unlockedAt: string;
}

export interface RegisterAccountInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Quick client-side checks so people get instant feedback (the server re-validates everything). */
export function validateRegistration(input: RegisterAccountInput): string | null {
  if (input.fullName.trim().length < 2) return 'Please enter your full name (at least 2 characters).';
  if (!EMAIL_RE.test(input.email.trim())) return 'Please enter a valid email address.';
  if (input.password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

export async function fetchCurrentSession(): Promise<AuthSession | null> {
  try {
    const { session } = await api<{ session: AuthSession | null }>('GET', '/api/auth/me');
    return session;
  } catch {
    return null;
  }
}

export async function registerAccount(input: RegisterAccountInput): Promise<AuthSession> {
  const { session } = await api<{ session: AuthSession }>('POST', '/api/auth/register', input);
  return session;
}

export async function signIn(identifier: string, password: string): Promise<AuthSession> {
  const { session } = await api<{ session: AuthSession }>('POST', '/api/auth/login', { identifier, password });
  return session;
}

export async function signOut(): Promise<void> {
  try {
    await api('POST', '/api/auth/logout');
  } catch {
    // Cookie will simply expire; nothing else to do.
  }
}
