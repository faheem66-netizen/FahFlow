const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

// Signup and login themselves happen entirely on the client via the Firebase
// Auth SDK (email/password and Google sign-in both -- see
// client/src/firebase.js and pages/Login.jsx, Signup.jsx). There is nothing
// to do here for those actions: the client gets a Firebase ID token directly
// from Firebase and sends it as a Bearer token on every API call.
//
// requireAuth verifies that token and lazily creates the matching Mongo
// tenant record on first sight, so this /me endpoint doubles as "give me my
// profile" for an existing user and "finish provisioning me" for a new one.
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    plan: user.plan,
    gmailConnected: !!user.gmail?.connected,
    gmailEmailAddress: user.gmail?.emailAddress || null,
    followUpDefaults: user.followUpDefaults,
  };
}

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Each tenant can rewrite their own follow-up wording and cadence -- this is
// what makes the product usable by different freelancers/agencies with
// different client relationships, rather than shipping one fixed script.
router.patch(
  '/settings',
  requireAuth,
  [
    body('delaysDays').optional().isArray({ min: 1 }),
    body('delaysDays.*').optional().isInt({ min: 1 }),
    body('messageTemplate').optional().isString().isLength({ max: 5000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { delaysDays, messageTemplate } = req.body;
    if (delaysDays) req.user.followUpDefaults.delaysDays = delaysDays;
    if (typeof messageTemplate === 'string' && messageTemplate.trim()) {
      req.user.followUpDefaults.messageTemplate = messageTemplate;
    }
    await req.user.save();

    res.json({ user: publicUser(req.user) });
  }
);

module.exports = router;
