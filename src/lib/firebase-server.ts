import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import localConfig from '../../firebase-applet-config.json' with { type: 'json' };

const firebaseConfig: any = localConfig || {};

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
// O Firestore deste projeto é um banco NOMEADO (não "(default)"). O admin SDK
// precisa apontar para o mesmo database do cliente, senão retorna 5 NOT_FOUND.
const databaseId =
  process.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)';

const app =
  admin.apps.length && admin.apps[0]
    ? admin.apps[0]
    : admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId,
      });

export const adminDb =
  databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);
export const adminAuth = admin.auth();
