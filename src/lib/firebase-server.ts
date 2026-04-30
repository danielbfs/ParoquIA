import admin from 'firebase-admin';
import localConfig from '../../firebase-applet-config.json' with { type: 'json' };

const firebaseConfig: any = localConfig || {};

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;

if (!admin.apps.length && projectId) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: projectId,
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
