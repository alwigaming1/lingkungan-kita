// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyC1-uw4TZYpLk7w7z3Emt4nkb8HmaVBJp4",
  authDomain: "lingkungan-kita-b4a53.firebaseapp.com",
  projectId: "lingkungan-kita-b4a53",
  storageBucket: "lingkungan-kita-b4a53.firebasestorage.app",
  messagingSenderId: "74826475158",
  appId: "1:74826475158:web:8634306cd960d0389d04b7",
  measurementId: "G-2KPC9J3NTN"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Hanya inisialisasi Firestore dan Auth
const db = firebase.firestore();
const auth = firebase.auth();

console.log("✅ Firebase initialized (without Storage)");