const admin = require('firebase-admin');

if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase env missing: ' + [
            !projectId && 'FIREBASE_PROJECT_ID',
            !clientEmail && 'FIREBASE_CLIENT_EMAIL',
            !privateKey && 'FIREBASE_PRIVATE_KEY'
        ].filter(Boolean).join(', '));
    }

    // Handle escaped newlines in private key
    privateKey = privateKey.replace(/^["']|["']$/g, '').trim();
    privateKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        })
    });
}

module.exports = admin;