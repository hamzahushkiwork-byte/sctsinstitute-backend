import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Rate limiter for registration endpoint
 * Limits: 10 requests per 15 minutes per IP
 */
export const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
    errors: null,
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req, res) => ipKeyGenerator(req, res),
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many registration attempts from this IP. Please try again after 15 minutes.',
      errors: null,
    });
  },
});
