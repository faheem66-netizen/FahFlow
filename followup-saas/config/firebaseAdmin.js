const admin = require('firebase-admin');

if (!admin.apps.length) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

    // Remove surrounding quotes if present
    privateKey = privateKey.replace(/^["']|["']$/g, '').trim();

    // Convert escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
        })
    });
}

module.exports = admin;