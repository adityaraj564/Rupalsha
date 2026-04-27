const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { auth, generateToken } = require('../middleware/auth');
const { sendPasswordReset, sendWelcomeEmail, sendPasswordChangeConfirmation, sendLoginOtp } = require('../utils/email');
const { createNotification } = require('../utils/notification');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, phone });
    const token = generateToken(user._id);

    // Send welcome email
    sendWelcomeEmail(name, email);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account has been blocked' });
    }

    const token = generateToken(user._id);

    // Security notification — new login (fire-and-forget)
    try {
      const ua = req.headers['user-agent'] || 'Unknown device';
      const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
      const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      createNotification({
        user: user._id,
        category: 'security',
        type: 'security.login',
        title: 'New sign-in to your account',
        message: `Signed in on ${ts}${ip ? ` from ${ip}` : ''}. If this wasn't you, please change your password.`,
        link: '/profile',
        priority: 3,
        meta: { ip, userAgent: ua },
      });
    } catch {}

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  // Look up password presence without exposing the hash
  const fresh = await User.findById(req.user._id).select('+password');
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      addresses: req.user.addresses,
      avatar: req.user.avatar,
      createdAt: req.user.createdAt,
      authProvider: fresh?.authProvider || 'local',
      hasPassword: !!(fresh && fresh.password),
      googleLinked: !!(fresh && fresh.googleId),
    },
  });
});

// PUT /api/auth/profile
router.put('/profile', auth, [
  body('name').optional().trim().notEmpty(),
  body('phone').optional().matches(/^[6-9]\d{9}$/),
], async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();
    res.json({ user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/change-password
// - If the user already has a password, currentPassword is required (existing behaviour).
// - If the user signed up via Google and has no password yet, allow setting one
//   without currentPassword (hybrid account upgrade).
router.put('/change-password', auth, [
  body('currentPassword').optional({ checkFalsy: true }),
  body('newPassword').isLength({ min: 6 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (user.password) {
      if (!currentPassword || !(await user.comparePassword(currentPassword))) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    user.password = newPassword;
    if (user.googleId) user.authProvider = 'hybrid';
    await user.save();

    sendPasswordChangeConfirmation(user.name, user.email);

    // Security notification
    createNotification({
      user: user._id,
      category: 'security',
      type: 'security.password_changed',
      title: 'Password updated',
      message: 'Your account password was changed. If this wasn\u2019t you, reset it immediately.',
      link: '/profile',
      priority: 3,
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    // Send email in background — don't block the response
    sendPasswordReset(user.email, resetUrl);

    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
], async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
});

// Address management
// POST /api/auth/addresses
router.post('/addresses', auth, [
  body('fullName').trim().notEmpty(),
  body('phone').matches(/^[6-9]\d{9}$/),
  body('addressLine1').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('state').trim().notEmpty(),
  body('pincode').matches(/^\d{6}$/),
], async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { fullName, phone, addressLine1, addressLine2, city, state, pincode, isDefault } = req.body;

    if (isDefault) {
      user.addresses.forEach(addr => { addr.isDefault = false; });
    }

    user.addresses.push({ fullName, phone, addressLine1, addressLine2, city, state, pincode, isDefault: isDefault || user.addresses.length === 0 });
    await user.save();

    res.status(201).json({ addresses: user.addresses });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/addresses/:id
router.put('/addresses/:id', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    Object.assign(address, req.body);

    if (req.body.isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = addr._id.toString() === req.params.id;
      });
    }

    await user.save();
    res.json({ addresses: user.addresses });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/auth/addresses/:id
router.delete('/addresses/:id', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.pull(req.params.id);
    await user.save();
    res.json({ addresses: user.addresses });
  } catch (error) {
    next(error);
  }
});

// ===== EMAIL OTP LOGIN =====

// POST /api/auth/login-otp/request
router.post('/login-otp/request', [
  body('email').isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;
    const user = await User.findOne({ email }).select('+loginOtp +loginOtpExpire +loginOtpAttempts');

    // Always respond generically to avoid leaking which emails are registered.
    const generic = { message: 'If an account exists for this email, a login code has been sent.' };

    if (!user) return res.json(generic);
    if (user.isBlocked) return res.json(generic);

    // Throttle: don't issue a new OTP if one was issued less than 30 seconds ago.
    if (user.loginOtpExpire && user.loginOtpExpire.getTime() - Date.now() > 9.5 * 60 * 1000) {
      return res.json(generic);
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
    const hashed = crypto.createHash('sha256').update(otp).digest('hex');
    user.loginOtp = hashed;
    user.loginOtpExpire = new Date(Date.now() + 10 * 60 * 1000);
    user.loginOtpAttempts = 0;
    await user.save();

    sendLoginOtp(user.name, user.email, otp);

    res.json(generic);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login-otp/verify
router.post('/login-otp/verify', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).matches(/^\d{6}$/),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Enter the 6-digit code from your email' });

    const { email, otp } = req.body;
    const user = await User.findOne({ email }).select('+loginOtp +loginOtpExpire +loginOtpAttempts');

    if (!user || !user.loginOtp || !user.loginOtpExpire) {
      return res.status(400).json({ error: 'Invalid or expired code. Please request a new one.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account has been blocked' });
    }
    if (user.loginOtpExpire.getTime() < Date.now()) {
      user.loginOtp = undefined;
      user.loginOtpExpire = undefined;
      user.loginOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }
    if ((user.loginOtpAttempts || 0) >= 5) {
      user.loginOtp = undefined;
      user.loginOtpExpire = undefined;
      user.loginOtpAttempts = 0;
      await user.save();
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }

    const hashed = crypto.createHash('sha256').update(otp).digest('hex');
    if (hashed !== user.loginOtp) {
      user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ error: 'Invalid code. Please try again.' });
    }

    // Success — clear OTP and issue token.
    user.loginOtp = undefined;
    user.loginOtpExpire = undefined;
    user.loginOtpAttempts = 0;
    await user.save();

    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===== GOOGLE SIGN-IN =====
// POST /api/auth/google
// Body: { credential: <Google ID token from GIS> }
// Verifies the ID token, then logs in or auto-creates the account.
router.post('/google', [
  body('credential').isString().notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid Google credential' });

    if (!googleClient) {
      return res.status(500).json({ error: 'Google sign-in is not configured on the server' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email_verified) {
      return res.status(401).json({ error: 'Google account email is not verified' });
    }

    const googleId = payload.sub;
    const email = String(payload.email || '').toLowerCase();
    const name = payload.name || (email ? email.split('@')[0] : 'User');
    const picture = payload.picture;

    if (!email) {
      return res.status(400).json({ error: 'Google account did not return an email' });
    }

    // 1) Look up by googleId (returning Google user)
    let user = await User.findOne({ googleId });
    let isNew = false;

    // 2) Otherwise look up by email (link existing local account)
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        user.authProvider = user.password ? 'hybrid' : 'google';
        if (!user.avatar?.url && picture) user.avatar = { url: picture, public_id: '' };
        await user.save();
      }
    }

    // 3) Otherwise auto-create a new account
    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        authProvider: 'google',
        avatar: picture ? { url: picture, public_id: '' } : undefined,
      });
      isNew = true;
      sendWelcomeEmail(name, email);
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account has been blocked' });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      isNew,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        authProvider: user.authProvider,
        hasPassword: !!user.password,
        googleLinked: true,
      },
    });
  } catch (error) {
    if (error?.message?.includes('Token used too')) {
      return res.status(401).json({ error: 'Google session expired. Please try again.' });
    }
    if (error?.message?.toLowerCase?.().includes('audience')) {
      return res.status(401).json({ error: 'Invalid Google client. Please contact support.' });
    }
    next(error);
  }
});

module.exports = router;
