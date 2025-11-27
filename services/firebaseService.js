require("dotenv").config();
const admin = require("firebase-admin");

let firebaseApp = null;

function initFirebase() {
  if (firebaseApp) return firebaseApp;

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);

  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✔ Firebase Initialized Successfully");
  return firebaseApp;
}

function getMessaging() {
  if (!firebaseApp) initFirebase();
  return admin.messaging();
}

module.exports = { initFirebase, getMessaging };