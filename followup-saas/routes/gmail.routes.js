const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const gmailService = require('../services/gmailService');

// Step 1: user clicks "Connect Gmail" in the dashboard, frontend hits this
// (with their JWT) to get a consent URL, then redirects the browser to it.
router.get('/connect', requireAuth, (req, res) => {
  const url = gmailService.getConsentUrl(req.user._id.toString());
  res.json({ url });
});

// Step 2: Google redirects the browser here after consent. `state` is the
// userId we passed in, so we know which tenant to attach these tokens to —
// this route deliberately does NOT use requireAuth, since the browser is
// coming straight from Google's servers, not carrying our JWT.
router.get('/callback', async (req, res) => {
  const { code, state: userId, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.CLIENT_URL}/dashboard?gmail=denied`);
  }

  try {
    const { tokens, emailAddress } = await gmailService.exchangeCodeForTokens(code);

    await User.findByIdAndUpdate(userId, {
      $set: {
        'gmail.connected': true,
        'gmail.emailAddress': emailAddress,
        'gmail.accessToken': tokens.access_token,
        'gmail.refreshToken': tokens.refresh_token, // only present on first consent
        'gmail.tokenExpiryDate': tokens.expiry_date,
      },
    });

    res.redirect(`${process.env.CLIENT_URL}/dashboard?gmail=connected`);
  } catch (err) {
    console.error('[gmail.callback]', err.message);
    res.redirect(`${process.env.CLIENT_URL}/dashboard?gmail=error`);
  }
});

// Step 3: Fetch user's Gmail threads for easy frontend selection (Fixes Invalid id value error)
router.get('/threads', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.gmail || !user.gmail.connected) {
      return res.status(400).json({ error: 'Gmail not connected for this user' });
    }

    const threads = await gmailService.listUserThreads(user);
    res.json({ success: true, threads });
  } catch (err) {
    console.error('[gmail.threads]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/disconnect', requireAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      'gmail.connected': false,
      'gmail.accessToken': null,
      'gmail.refreshToken': null,
      'gmail.tokenExpiryDate': null,
    },
  });
  res.json({ ok: true });
});

module.exports = router;