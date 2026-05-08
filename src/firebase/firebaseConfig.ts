import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDgmS7HrDPUMJ660ibzGMW0Xvt7oEG79Po",
  authDomain: "schools2ai.firebaseapp.com",
  projectId: "schools2ai",
  storageBucket: "schools2ai.firebasestorage.app",
  messagingSenderId: "1040782150462",
  appId: "1:1040782150462:web:aa63054b17b40c0329ba6f",
  measurementId: "G-MHJTEP5ZGT"
};

export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);