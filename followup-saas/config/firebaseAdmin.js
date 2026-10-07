const admin = require('firebase-admin');

// Firebase handles signup/login entirely on the client (email/password and
// Google sign-in both go through the Firebase client SDK — see
// client/src/firebase.js). The backend never sees a password or issues its
// own login tokens; it only verifies the ID token Firebase already issued.
if (!admin.apps.length) {
  let rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || '';

  // Handle both literal string "\n" (escaped) and surrounding quotes or line break issues
  let formattedKey = rawPrivateKey
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes if any
    .replace(/\\n/g, '\n');      // Convert literal \n text into actual newlines

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: formattedKey,
    }),
  });
}

module.exports = admin;