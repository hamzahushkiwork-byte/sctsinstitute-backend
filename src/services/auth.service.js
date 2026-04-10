import crypto from 'crypto';
import User from '../models/User.model.js';
import PasswordResetOtp from '../models/PasswordResetOtp.model.js';
import bcrypt from 'bcrypt';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendPasswordResetOtpEmail } from './emailService.js';

const OTP_EXPIRY_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function generateSixDigitOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function login(data) {
  const { email, password } = data;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const accessToken = signAccessToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  const refreshToken = signRefreshToken({
    userId: user._id.toString(),
  });

  return {
    user: {
      id: user._id.toString(),
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      name: user.name || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || ''),
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

export async function signup(data) {
  const { firstName, lastName, email, phoneNumber, password } = data;

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  try {
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`, // For backward compatibility
      email: normalizedEmail,
      phoneNumber: phoneNumber.trim(),
      passwordHash,
      role: 'user', // Default role for new signups
    });

    // Generate tokens
    const accessToken = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = signRefreshToken({
      userId: user._id.toString(),
    });

    return {
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name || `${user.firstName} ${user.lastName}`,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    // Handle duplicate key errors (e.g., duplicate email)
    if (error.code === 11000) {
      throw new Error('Email already registered');
    }
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      throw new Error(messages.join(', '));
    }
    // Re-throw other errors
    throw error;
  }
}

export async function refresh(data) {
  const { refreshToken } = data;

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
    };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}

export async function logout(data) {
  // Stateless logout - just return success
  return {
    message: 'Logged out successfully',
  };
}

/**
 * Create OTP and send email if user exists. Caller should always return a generic success message.
 * @returns {{ emailSent: boolean, userFound: boolean }}
 */
export async function requestPasswordReset(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return { emailSent: false, userFound: false };
  }

  const otp = generateSixDigitOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await PasswordResetOtp.findOneAndUpdate(
    { email: normalizedEmail },
    { $set: { otpHash, expiresAt, attempts: 0 } },
    { upsert: true }
  );

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const emailSent = await sendPasswordResetOtpEmail({
    to: normalizedEmail,
    otp,
    name: name || user.name || '',
  });

  if (!emailSent) {
    await PasswordResetOtp.deleteOne({ email: normalizedEmail });
  }

  return { emailSent, userFound: true };
}

/**
 * Verify OTP and set new password.
 */
export async function resetPasswordWithOtp({ email, otp, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const otpStr = String(otp).trim();

  const record = await PasswordResetOtp.findOne({ email: normalizedEmail });
  if (!record) {
    throw new Error('Invalid or expired verification code');
  }
  if (record.expiresAt.getTime() < Date.now()) {
    await PasswordResetOtp.deleteOne({ _id: record._id });
    throw new Error('Invalid or expired verification code');
  }
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await PasswordResetOtp.deleteOne({ _id: record._id });
    throw new Error('Too many incorrect attempts. Please request a new code');
  }

  const match = await bcrypt.compare(otpStr, record.otpHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    throw new Error('Invalid or expired verification code');
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    await PasswordResetOtp.deleteOne({ _id: record._id });
    throw new Error('Invalid or expired verification code');
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  await PasswordResetOtp.deleteOne({ _id: record._id });

  return { message: 'Password updated successfully' };
}
