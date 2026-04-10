import User from '../models/User.model.js';
import bcrypt from 'bcrypt';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

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
