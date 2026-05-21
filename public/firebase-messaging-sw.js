// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDgmS7HrDPUMJ660ibzGMW0Xvt7oEG79Po",
  authDomain: "schools2ai.firebaseapp.com",
  projectId: "schools2ai",
  storageBucket: "schools2ai.firebasestorage.app",
  messagingSenderId: "1040782150462",
  appId: "1:1040782150462:web:aa63054b17b40c0329ba6f",
});

const messaging = firebase.messaging();
console.log("this from worker", this)


console.log("Firebase messaging initialized");
messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);
  // Create an objectStore for this database

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png",
  });
});