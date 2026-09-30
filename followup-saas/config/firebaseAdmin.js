const admin = require('firebase-admin');

// Firebase handles signup/login entirely on the client (email/password and
// Google sign-in both go through the Firebase client SDK — see
// client/src/firebase.js). The backend never sees a password or issues its
// own login tokens; it only verifies the ID token Firebase already issued.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env stores literal \n escapes; convert them back to real newlines.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

module.exports = admin;
