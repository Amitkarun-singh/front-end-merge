const DB_NAME = "schools2ai";
const DB_VERSION = 4;

export interface NotificationItem {
    id?: number;
    userId: string;
    title: string;
    body: string;
    icon?: string;
    timestamp: number;
    read: boolean;
}

export const initDB = (): Promise<IDBDatabase> => {
    console.log("indexDB from app")
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create notifications store
            if (!db.objectStoreNames.contains("notifications")) {
                const notificationStore = db.createObjectStore("notifications", {
                    keyPath: "id",
                    autoIncrement: true,
                });
                notificationStore.createIndex("userId", "userId", { unique: false });
            }

            // Create session store
            if (!db.objectStoreNames.contains("session")) {
                db.createObjectStore("session", { keyPath: "key" });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

export const saveUserSession = async (userId: string): Promise<void> => {
    console.log("storing userid", userId);
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("session", "readwrite");
        const store = tx.objectStore("session");
        const request = store.put({ key: "currentUserId", value: userId });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearUserSession = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("session", "readwrite");
        const store = tx.objectStore("session");
        const request = store.delete("currentUserId");

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getCurrentUserId = async (): Promise<string | null> => {
    console.log("[indexDB] current user id called");
    const db = await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction("session", "readonly");
        const store = tx.objectStore("session");
        const request = store.get("currentUserId");

        request.onsuccess = () => {
            resolve(request.result ? request.result.value : null);
        };
        request.onerror = () => {
            resolve(null);
        };
    });
};

// export const addNotification = async (
//     userId: string,
//     notification: { title: string; body: string; icon?: string }
// ): Promise<void> => {
//     const db = await initDB();
//     return new Promise((resolve, reject) => {
//         const tx = db.transaction("notifications", "readwrite");
//         const store = tx.objectStore("notifications");
//         const item: NotificationItem = {
//             userId,
//             title: notification.title,
//             body: notification.body,
//             icon: notification.icon,
//             timestamp: Date.now(),
//             read: false,
//         };
//         const request = store.add(item);

//         request.onsuccess = () => resolve();
//         request.onerror = () => reject(request.error);
//     });
// };

export async function addNotification(
    userId: string,
    notification: { title: string; body: string; icon?: string }
): Promise<void> {
    console.log("Adding notification...")
    const db = await initDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction("notifications", "readwrite");
        const store = tx.objectStore("notifications");

        const item = {
            userId,
            title: notification.title,
            body: notification.body,
            icon: notification.icon || "/icon.png",
            timestamp: Date.now(),
            read: false,
        };

        store.add(item);

        tx.oncomplete = () => {
            console.log("Notification saved");
            resolve();
        };

        tx.onerror = () => {
            console.error("TX Error", tx.error);
            reject(tx.error);
        };

        tx.onabort = () => {
            console.error("TX Abort", tx.error);
            reject(tx.error);
        };
    });
}

export const getUnreadNotifications = async (
    userId: string
): Promise<NotificationItem[]> => {
    console.log("[indexDB] getUnreadNotifications called");
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("notifications", "readonly");
        const store = tx.objectStore("notifications");
        const index = store.index("userId");
        const request = index.getAll(userId);

        request.onsuccess = () => {
            const all = request.result as NotificationItem[];
            const unread = all.filter((n) => !n.read);
            resolve(unread);
        };
        request.onerror = () => reject(request.error);
    });
};

export const markAllAsRead = async (userId: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("notifications", "readwrite");
        const store = tx.objectStore("notifications");
        const index = store.index("userId");
        const request = index.openCursor(userId);

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
                const updateData = cursor.value as NotificationItem;
                if (!updateData.read) {
                    updateData.read = true;
                    cursor.update(updateData);
                }
                cursor.continue();
            } else {
                resolve();
            }
        };
        request.onerror = () => reject(request.error);
    });
};