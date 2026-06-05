import { app } from "./firebaseConfig.ts";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import fpPromise from '@fingerprintjs/fingerprintjs';
import { config } from "../../app.config.js";
import { addNotification, getUnreadNotifications, markAllAsRead, getCurrentUserId } from "../indexDB/indexDB";
import { toast } from "../hooks/use-toast";



export const initializeNotifications = async () => {
  try {
    console.log("[Notification] Initializing...");
    if (!('Notification' in window)) {
      console.warn("[Notification] This browser does not support desktop notification");
      return;
    }


    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.warn("[Notification] Notification permission not granted.");
      return;
    }


    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: "BD1cZo6qlMqKDsWop-TerAFWcJEk4hK-5TdPxpf4K4-s_ELPJ7pCXHbiZ962Q7ilDSL_D_liaDdGgWhFqqp6XSk",
    });

    if (token) {
      console.log("[Notification] Firebase Messaging Token:", token);

      // Listen for foreground messages
      onMessage(messaging, async (payload) => {
        console.log("[Notification] Foreground message received:", payload);
        const title = payload.notification?.title || "New Notification";
        const options = {
          body: payload.notification?.body || "",
          icon: payload.notification?.icon
        };

        // Save to IndexedDB if user is logged in
        try {
          const userId = await getCurrentUserId();

          if (userId) {
            await addNotification(userId, {
              title,
              body: options.body,
              icon: options.icon
            });

          }
        } catch (dbErr) {
          console.error("[Notification] Error saving foreground notification to IndexedDB:", dbErr);
        }

        // Show toast in-app
        toast({
          title,
          description: options.body,
        });

        // Show system notification if in foreground
        if (Notification.permission === 'granted') {
          new Notification(title, options);
        }
      });

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

    const response = await fetch(`${config.server}/api/v1/notification/register`, {
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

export const handleLoginNotifications = async (userId: string) => {
  try {
    console.log("[Notification] Checking login notifications for userId:", userId);
    const unread = await getUnreadNotifications(userId);
    console.log("[Notification] Unread notifications:", unread);
    if (unread && unread.length > 0) {
      if (unread.length === 1) {
        const n = unread[0];
        toast({
          title: n.title,
          description: n.body,
        });
        // if (Notification.permission === 'granted') {
        //   new Notification(n.title, { body: n.body, icon: n.icon });
        // }
      } else {
        toast({
          title: "New Notifications",
          description: `You have ${unread.length} new notifications.`,
        });
        if (Notification.permission === 'granted') {
          new Notification("New Notifications", {
            body: `You have ${unread.length} new notifications.`,
          });
        }
      }
      await markAllAsRead(userId);
      console.log("[Notification] Marked all notifications as read for userId:", userId);
    }
  } catch (err) {
    console.error("[Notification] Error handling login notifications:", err);
  }
};