import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBL9VLzRlODVVN_ieFirid-O285U-0ulZA",
  authDomain: "lateagain-face2.firebaseapp.com",
  projectId: "lateagain-face2",
  storageBucket: "lateagain-face2.firebasestorage.app",
  messagingSenderId: "48076660993",
  appId: "1:48076660993:web:e25e448deea99ce684fb00",
  measurementId: "G-8MF8QMWMM1"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
