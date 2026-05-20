import { app } from "./firebaseConfig.ts";
import { getMessaging, getToken } from "firebase/messaging";
import fpPromise from '@fingerprintjs/fingerprintjs';
import { config } from "../../app.config.js";



export const initializeNotifications = async () => {
  try {
    console.log("[Notification] Initializing...");
    if (!('Notification' in window)) {
      console.warn("[Notification] This browser does not support desktop notification");
      return;
    }

    console.log("[Notification] Requesting permission...");
    const permission = await Notification.requestPermission();
    console.log("[Notification] Permission status:", permission);
    if (permission !== 'granted') {
      console.warn("[Notification] Notification permission not granted.");
      return;
    }

    console.log("[Notification] Getting messaging instance...");
    const messaging = getMessaging(app);
    console.log("[Notification] Fetching token...");
    const token = await getToken(messaging, {
      vapidKey: "BD1cZo6qlMqKDsWop-TerAFWcJEk4hK-5TdPxpf4K4-s_ELPJ7pCXHbiZ962Q7ilDSL_D_liaDdGgWhFqqp6XSk",
    });

    if (token) {
      console.log("[Notification] Firebase Messaging Token:", token);
      return token;
    } else {
      console.warn("[Notification] No registration token available.");
    }
  } catch (err) {
    console.error("[Notification] An error occurred while retrieving token:", err);
  }
};

export const registerNotificationToken = async (authToken: string) => {
  console.log("[Notification] Registering ");
  try {
    // console.log(`[Notification] Registering for userId: ${userId}`);
    const notificaationToken = await initializeNotifications();
    if (!notificaationToken) {
      console.log("[Notification] Failed to get push token. Aborting registration.");
      return;
    }

    console.log("[Notification] Loading fingerprintjs...");
    const fp = await fpPromise.load();
    const result = await fp.get();
    const deviceId = result.visitorId;
    console.log(`[Notification] DeviceId: ${deviceId}`);

    const payload = { token: notificaationToken, deviceId };
    console.log("[Notification] Sending POST request with payload:", payload);

    const response = await fetch(`${config.server}/notification/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error("[Notification] Failed to register token, HTTP status:", response.status);
      const text = await response.text();
      console.error("[Notification] Response body:", text);
    } else {
      console.log("[Notification] Successfully registered notification token!");
    }
  } catch (error) {
    console.error("[Notification] Error in registerNotificationToken:", error);
  }
};