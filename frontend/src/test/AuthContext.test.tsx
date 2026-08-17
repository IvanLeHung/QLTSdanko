import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('../lib/api', () => ({
  default: { get: apiGet }
}));

import { AuthProvider, useAuth } from '../context/AuthContext';

const CurrentUser = () => {
  const { user, loading } = useAuth();
  if (loading) return <span>loading</span>;
  return <span>{user?.fullName || 'guest'}</span>;
};

const cachedUser = {
  id: 7,
  username: 'tester',
  fullName: 'Người kiểm thử',
  role: 'USER',
  roles: ['USER'],
  permissions: ['INVENTORY_VIEW']
};

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    apiGet.mockReset();
  });

  it('keeps the current session when the server is temporarily unreachable', async () => {
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('auth_user', JSON.stringify(cachedUser));
    apiGet.mockRejectedValueOnce(new Error('Network Error'));

    render(<AuthProvider><CurrentUser /></AuthProvider>);

    expect(await screen.findByText('Người kiểm thử')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBe('valid-token');
  });

  it('clears the session when the server confirms that the token is invalid', async () => {
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('auth_user', JSON.stringify(cachedUser));
    apiGet.mockRejectedValueOnce({ response: { status: 401 } });

    render(<AuthProvider><CurrentUser /></AuthProvider>);

    expect(await screen.findByText('guest')).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('token')).toBeNull());
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});
