'use client';

import type { AuthUser } from './types';

const TOKEN_KEY = 'consi_token';
const ENV_KEY = 'consi_env';
const USER_KEY = 'consi_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getEnvironment(): 'TEST' | 'LIVE' {
  if (typeof window === 'undefined') return 'TEST';
  return (window.localStorage.getItem(ENV_KEY) as 'TEST' | 'LIVE') ?? 'TEST';
}

export function setEnvironment(env: 'TEST' | 'LIVE'): void {
  window.localStorage.setItem(ENV_KEY, env);
}
