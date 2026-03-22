const admin = require('firebase-admin');

let firebaseApp;

const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });

    console.log('Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
    throw error;
  }
};

initializeFirebase();

module.exports = admin;
