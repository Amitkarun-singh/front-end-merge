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
console.log("this from worker", this);

console.log("Firebase messaging initialized");

const DB_NAME = "schools2ai";
const DB_VERSION = 4;

function openDB() {
  console.log("indexDB from woker")
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("notifications")) {
        const notificationStore = db.createObjectStore("notifications", {
          keyPath: "id",
          autoIncrement: true,
        });
        notificationStore.createIndex("userId", "userId", { unique: false });
      }
      if (!db.objectStoreNames.contains("session")) {
        db.createObjectStore("session", { keyPath: "key" });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function getUserIdFromSession(db) {
  return new Promise((resolve) => {
    const tx = db.transaction("session", "readonly");
    const store = tx.objectStore("session");
    const request = store.get("currentUserId");
    request.onsuccess = (e) => {
      resolve(e.target.result ? e.target.result.value : null);
    };
    request.onerror = () => resolve(null);
  });
}

function saveNotificationToDB(db, userId, title, body, icon) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notifications", "readwrite");
    const store = tx.objectStore("notifications");
    const request = store.add({
      userId: userId,
      title: title || "New Notification",
      body: body || "",
      icon: icon || "/icon.png",
      timestamp: Date.now(),
      read: false,
    });
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

messaging.onBackgroundMessage(async (payload) => {
  console.log("Background message received:", payload);

  const title = payload.notification?.title || "New Notification";
  const body = payload.notification?.body || "";
  const icon = payload.notification?.icon || "/icon.png";

  try {
    const db = await openDB();
    const userId = await getUserIdFromSession(db);
    if (userId) {
      await saveNotificationToDB(db, userId, title, body, icon);
      console.log("Successfully saved background notification in IndexedDB for user:", userId);
    } else {
      console.log("No logged-in user in IndexedDB session. Background notification not saved.");
    }
  } catch (err) {
    console.error("Failed to save background notification in IndexedDB:", err);
  }

  self.registration.showNotification(title, {
    body: body,
    icon: icon,
  });
});