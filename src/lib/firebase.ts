import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
};

async function initFirebase() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase ready');
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("Firebase is offline. Check configuration.");
    }
  }
}
initFirebase();
