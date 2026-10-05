import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { SignInPage } from './SignInPage';

const signIn = vi.fn();
const register = vi.fn();
vi.mock('./AuthProvider', () => ({ useAuth: () => ({ signIn, register }) }));

beforeEach(() => {
  signIn.mockReset().mockResolvedValue(undefined);
  register.mockReset().mockResolvedValue(undefined);
});

describe('SignInPage form', () => {
  it('shows field errors and does not call sign-in when the form is invalid', async () => {
    render(<SignInPage />);
    await userEvent.type(screen.getByLabelText('Work email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toHaveAttribute('aria-invalid', 'true');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('signs in with valid details', async () => {
    render(<SignInPage />);
    await userEvent.type(screen.getByLabelText('Work email'), '  apatel@projectaccountants.co.uk ');
    await userEvent.type(screen.getByLabelText('Password'), 'secret-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(signIn).toHaveBeenCalledWith('apatel@projectaccountants.co.uk', 'secret-pass');
  });

  it('applies the request-access rules and keeps the typed email when switching tabs', async () => {
    render(<SignInPage />);
    await userEvent.type(screen.getByLabelText('Work email'), 'glin@projectaccountants.co.uk');
    await userEvent.click(screen.getByRole('tab', { name: 'Request access' }));
    expect(screen.getByLabelText('Work email')).toHaveValue('glin@projectaccountants.co.uk');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Request access' }));
    expect(await screen.findByText('Enter your full name')).toBeInTheDocument();
    expect(screen.getByText('Use at least 10 characters')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Full name'), 'Grace Lin');
    await userEvent.type(screen.getByLabelText('Password'), '-and-longer');
    await userEvent.click(screen.getByRole('button', { name: 'Request access' }));
    expect(register).toHaveBeenCalledWith('Grace Lin', 'glin@projectaccountants.co.uk', 'short-and-longer');
  });

  it('puts server field errors next to the field', async () => {
    register.mockRejectedValue(new ApiError('An account with this email already exists.', 409, 'EMAIL_TAKEN', [{ path: 'email', message: 'Already registered' }]));
    render(<SignInPage />);
    await userEvent.click(screen.getByRole('tab', { name: 'Request access' }));
    await userEvent.type(screen.getByLabelText('Full name'), 'Grace Lin');
    await userEvent.type(screen.getByLabelText('Work email'), 'glin@projectaccountants.co.uk');
    await userEvent.type(screen.getByLabelText('Password'), 'long-enough-1');
    await userEvent.click(screen.getByRole('button', { name: 'Request access' }));
    expect(await screen.findByText('Already registered')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('An account with this email already exists.');
  });
});
