import { app } from "./firebaseConfig.ts";
import { getMessaging, getToken } from "firebase/messaging";

export const initializeNotifications = async () => {
  try {
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: "BD1cZo6qlMqKDsWop-TerAFWcJEk4hK-5TdPxpf4K4-s_ELPJ7pCXHbiZ962Q7ilDSL_D_liaDdGgWhFqqp6XSk",
    });
    
    if (token) {
      console.log("Firebase Messaging Token:", token);
      return token;
    } else {
      console.warn("No registration token available.");
    }
  } catch (err) {
    console.error("An error occurred while retrieving token:", err);
  }
};