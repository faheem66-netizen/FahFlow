const admin = require('../config/firebaseAdmin');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!idToken) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);

    // 1. Pehle firebaseUid se dhundein
    let user = await User.findOne({ firebaseUid: decoded.uid });

    // 2. Agar firebaseUid se nahi mila, lekin email match ho gaya (matlab user delete karke dobara bana hai)
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email });
      if (user) {
        // Purane user ka firebaseUid update kar dein naye wale se
        user.firebaseUid = decoded.uid;
        if (decoded.name) user.name = decoded.name;
        if (decoded.picture) user.avatarUrl = decoded.picture;
        await user.save();
      }
    }

    // 3. Agar bilkul naya user hai toh create kar dein
    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email,
        name: decoded.name || decoded.email?.split('@')[0] || 'New user',
        avatarUrl: decoded.picture,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { requireAuth };