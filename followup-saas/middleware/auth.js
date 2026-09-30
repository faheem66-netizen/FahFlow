const admin = require('../config/firebaseAdmin');
const User = require('../models/User');

// Every protected route runs this first. The client sends the Firebase ID
// token it got from signInWithEmailAndPassword / signInWithPopup(Google) /
// onIdTokenChanged as a Bearer token. We verify it with Firebase Admin, then
// look up (or lazily create) the matching Mongo User -- that Mongo document,
// keyed by firebaseUid, is the tenant. Every downstream query filters by
// req.user._id, so nothing here should ever trust an id from the request body.
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!idToken) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);

    let user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      // First request after a brand-new Firebase signup -- provision the
      // tenant record now rather than requiring a separate "register" call.
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
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { requireAuth };
