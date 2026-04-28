import { ok, fail } from '../utils/response.js';
import * as authService from '../services/auth.service.js';
import { sendWelcomeEmail } from '../services/emailService.js';
import { sendAdminNotification } from '../services/mailer.js';

export async function login(req, res) {
  try {
    const result = await authService.login(req.body);
    return ok(res, result);
  } catch (error) {
    return fail(res, 401, error.message || 'Login failed');
  }
}

export async function signup(req, res) {
  try {
    const result = await authService.signup(req.body);

    const userFullName = `${result.user.firstName} ${result.user.lastName}`;
    let emailSent = false;
    try {
      emailSent = await sendWelcomeEmail({
        to: result.user.email,
        name: userFullName,
      });
    } catch {
      emailSent = false;
    }

    try {
      await sendAdminNotification(result.user);
    } catch (err) {
      console.error('[auth] Admin notification email failed:', err?.message || err);
    }

    const message = emailSent
      ? 'User registered successfully. A confirmation email has been sent.'
      : 'User registered successfully. We could not send a confirmation email—please check that email (SMTP) is configured.';
    
    return res.status(201).json({
      success: true,
      data: {
        ...result,
        emailSent,
      },
      message,
      errors: null,
    });
  } catch (error) {
    // Check if it's a duplicate email error
    if (error.message === 'Email already registered') {
      return fail(res, 409, error.message);
    }
    // Check for validation errors
    if (error.name === 'ValidationError' || error.name === 'ZodError') {
      return fail(res, 400, error.message || 'Validation failed');
    }
    // Log the full error for debugging
    console.error('Signup error:', error);
    return fail(res, 500, error.message || 'Signup failed');
  }
}

export async function refresh(req, res) {
  try {
    const result = await authService.refresh(req.body);
    return ok(res, result);
  } catch (error) {
    return fail(res, 401, error.message || 'Token refresh failed');
  }
}

export async function logout(req, res) {
  try {
    const result = await authService.logout(req.body);
    return ok(res, result);
  } catch (error) {
    return fail(res, 500, error.message || 'Logout failed');
  }
}

/**
 * Request OTP by email (same response whether or not the email exists).
 */
export async function forgotPassword(req, res) {
  try {
    const { emailSent, userFound } = await authService.requestPasswordReset(req.body.email);

    if (userFound && !emailSent) {
      console.error('Password reset: user found but email failed to send for', req.body.email);
    }

    return ok(
      res,
      null,
      'If an account exists for this email, you will receive a password reset code shortly.'
    );
  } catch (error) {
    console.error('forgotPassword error:', error);
    return fail(res, 500, error.message || 'Request failed');
  }
}

/**
 * Submit OTP + new password.
 */
export async function resetPassword(req, res) {
  try {
    await authService.resetPasswordWithOtp(req.body);
    return ok(res, null, 'Your password has been reset. You can sign in with your new password.');
  } catch (error) {
    const msg = error.message || 'Reset failed';
    if (
      msg.includes('Invalid or expired') ||
      msg.includes('Too many incorrect')
    ) {
      return fail(res, 400, msg);
    }
    console.error('resetPassword error:', error);
    return fail(res, 500, msg);
  }
}
