const admin = require('firebase-admin');

// Firebase handles signup/login entirely on the client (email/password and
// Google sign-in both go through the Firebase client SDK — see
// client/src/firebase.js). The backend never sees a password or issues its
// own login tokens; it only verifies the ID token Firebase already issued.
if (!admin.apps.length) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

    // Handle both literal string "\n" (escaped) and actual multiline keys
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // Clean up any surrounding quotes if present
    privateKey = privateKey.replace(/^["']|["']$/g, '').trim();

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

module.exports = admin;