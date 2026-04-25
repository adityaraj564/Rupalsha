const express = require('express');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const User = require('../models/User');
const { auth, generateToken } = require('../middleware/auth');

const router = express.Router();

const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'Rupalsha';

// Derive RP ID + origin from FRONTEND_URL.
// Both browsers and the spec require the RP ID to be the registrable domain
// (no scheme, no port). For localhost we use 'localhost'.
const deriveRp = () => {
  const url = process.env.FRONTEND_URL || 'http://localhost:3000';
  try {
    const u = new URL(url);
    return { rpID: u.hostname, origin: u.origin };
  } catch {
    return { rpID: 'localhost', origin: 'http://localhost:3000' };
  }
};

// Allow multiple origins (e.g. www and bare domain) via comma-separated env.
const allowedOrigins = () => {
  const list = (process.env.WEBAUTHN_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length) return list;
  return [deriveRp().origin];
};

// ===== REGISTRATION (must be authenticated) =====

// POST /api/auth/passkey/register/options
router.post('/register/options', auth, async (req, res, next) => {
  try {
    const { rpID } = deriveRp();
    const user = await User.findById(req.user._id).select('+passkeys +currentChallenge');

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID: Buffer.from(String(user._id)),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: (user.passkeys || []).map((p) => ({
        id: p.credentialID,
        type: 'public-key',
        transports: p.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    user.currentChallenge = options.challenge;
    await user.save();

    res.json(options);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/passkey/register/verify
router.post('/register/verify', auth, async (req, res, next) => {
  try {
    const { rpID } = deriveRp();
    const { response, name } = req.body;
    const user = await User.findById(req.user._id).select('+passkeys +currentChallenge');

    if (!user.currentChallenge) {
      return res.status(400).json({ error: 'No registration in progress. Please retry.' });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: allowedOrigins(),
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      user.currentChallenge = undefined;
      await user.save();
      return res.status(400).json({ error: 'Passkey could not be verified' });
    }

    const reg = verification.registrationInfo;
    // simplewebauthn v11+ wraps fields under .credential
    const cred = reg.credential || {};
    const credentialID = cred.id || reg.credentialID;
    const credentialPublicKey = cred.publicKey || reg.credentialPublicKey;
    const counter = cred.counter ?? reg.counter ?? 0;

    if (!credentialID || !credentialPublicKey) {
      user.currentChallenge = undefined;
      await user.save();
      return res.status(400).json({ error: 'Invalid passkey response' });
    }

    const credIdB64 =
      typeof credentialID === 'string'
        ? credentialID
        : Buffer.from(credentialID).toString('base64url');
    const pubKeyB64 = Buffer.from(credentialPublicKey).toString('base64url');

    user.passkeys = user.passkeys || [];
    if (user.passkeys.some((p) => p.credentialID === credIdB64)) {
      user.currentChallenge = undefined;
      await user.save();
      return res.status(400).json({ error: 'This passkey is already registered' });
    }

    user.passkeys.push({
      credentialID: credIdB64,
      publicKey: pubKeyB64,
      counter,
      transports: response?.response?.transports || [],
      deviceType: reg.credentialDeviceType,
      backedUp: reg.credentialBackedUp,
      name: name || 'Passkey',
      createdAt: new Date(),
    });
    user.currentChallenge = undefined;
    await user.save();

    res.json({ verified: true });
  } catch (err) {
    next(err);
  }
});

// ===== AUTHENTICATION (no auth required) =====

// In-memory map of challenges keyed by a temporary token returned to the client.
// This allows passkey login without first knowing the user (resident keys).
const pendingChallenges = new Map();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const setChallenge = (key, challenge) => {
  pendingChallenges.set(key, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS });
  // Cleanup expired entries opportunistically
  if (pendingChallenges.size > 500) {
    const now = Date.now();
    for (const [k, v] of pendingChallenges) {
      if (v.expiresAt < now) pendingChallenges.delete(k);
    }
  }
};
const getChallenge = (key) => {
  const entry = pendingChallenges.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    pendingChallenges.delete(key);
    return null;
  }
  return entry.challenge;
};

// POST /api/auth/passkey/login/options
// Body may include { email } to scope to a user; otherwise allows any registered passkey (resident key).
router.post('/login/options', async (req, res, next) => {
  try {
    const { rpID } = deriveRp();
    const { email } = req.body || {};

    let allowCredentials = [];
    if (email) {
      const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passkeys');
      if (user && user.passkeys?.length) {
        allowCredentials = user.passkeys.map((p) => ({
          id: p.credentialID,
          type: 'public-key',
          transports: p.transports,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setChallenge(sessionId, options.challenge);

    res.json({ options, sessionId });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/passkey/login/verify
router.post('/login/verify', async (req, res, next) => {
  try {
    const { rpID } = deriveRp();
    const { response, sessionId } = req.body || {};
    const challenge = sessionId ? getChallenge(sessionId) : null;
    if (!challenge) {
      return res.status(400).json({ error: 'Login challenge expired. Please try again.' });
    }

    const credId = response?.id;
    if (!credId) return res.status(400).json({ error: 'Invalid passkey response' });

    const user = await User.findOne({ 'passkeys.credentialID': credId }).select('+passkeys');
    if (!user) return res.status(400).json({ error: 'Passkey not recognised' });
    if (user.isBlocked) return res.status(403).json({ error: 'Account has been blocked' });

    const stored = user.passkeys.find((p) => p.credentialID === credId);
    if (!stored) return res.status(400).json({ error: 'Passkey not recognised' });

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: allowedOrigins(),
      expectedRPID: rpID,
      credential: {
        id: stored.credentialID,
        publicKey: Buffer.from(stored.publicKey, 'base64url'),
        counter: stored.counter || 0,
        transports: stored.transports,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Passkey verification failed' });
    }

    pendingChallenges.delete(sessionId);

    stored.counter = verification.authenticationInfo?.newCounter ?? stored.counter;
    stored.lastUsedAt = new Date();
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
  } catch (err) {
    next(err);
  }
});

// ===== MANAGEMENT =====

// GET /api/auth/passkey — list current user's passkeys (no secrets)
router.get('/', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+passkeys');
    const list = (user.passkeys || []).map((p) => ({
      id: p._id,
      name: p.name,
      deviceType: p.deviceType,
      backedUp: p.backedUp,
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt,
    }));
    res.json({ passkeys: list });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/passkey/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+passkeys');
    const before = user.passkeys?.length || 0;
    user.passkeys = (user.passkeys || []).filter((p) => p._id.toString() !== req.params.id);
    if (user.passkeys.length === before) {
      return res.status(404).json({ error: 'Passkey not found' });
    }
    await user.save();
    res.json({ message: 'Passkey removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
