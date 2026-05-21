# Push Notification System Technical Documentation

## Overview

This module implements a client-side push notification system using:

* **Firebase Cloud Messaging (FCM)** for push delivery
* **IndexedDB** for local notification persistence
* **FingerprintJS** for device identification
* **Browser Notification API** for system notifications
* **Toast UI notifications** for in-app alerts

The system supports:

* Foreground notification handling
* Offline/local notification persistence
* User-specific notification storage
* Read/unread notification tracking
* Session-based notification management
* Device token registration

---

# Architecture

## Components

| Component                | Responsibility                     |
| ------------------------ | ---------------------------------- |
| Firebase Messaging       | Receives push notifications        |
| IndexedDB                | Stores notifications locally       |
| Session Store            | Tracks logged-in user              |
| FingerprintJS            | Generates unique device identifier |
| Browser Notification API | Displays system notifications      |
| Toast System             | Displays in-app notifications      |

---

# IndexedDB Layer

## Database Configuration

```ts
const DB_NAME = "schools2ai";
const DB_VERSION = 4;
```

### Database Stores

| Store Name    | Purpose                       |
| ------------- | ----------------------------- |
| notifications | Stores user notifications     |
| session       | Stores current logged-in user |

---

# Notification Data Model

## NotificationItem Interface

```ts
export interface NotificationItem {
    id?: number;
    userId: string;
    title: string;
    body: string;
    icon?: string;
    timestamp: number;
    read: boolean;
}
```

## Field Description

| Field     | Type    | Description                  |
| --------- | ------- | ---------------------------- |
| id        | number  | Auto-incremented primary key |
| userId    | string  | Associated user identifier   |
| title     | string  | Notification title           |
| body      | string  | Notification message         |
| icon      | string  | Notification icon URL        |
| timestamp | number  | Unix timestamp               |
| read      | boolean | Read status                  |

---

# Database Initialization

## initDB()

Initializes IndexedDB and creates required object stores.

```ts
export const initDB = (): Promise<IDBDatabase>
```

## Responsibilities

* Opens IndexedDB connection
* Handles schema upgrades
* Creates object stores
* Creates indexes

## Stores Created

### notifications Store

```ts
{
  keyPath: "id",
  autoIncrement: true
}
```

### Index

```ts
notificationStore.createIndex("userId", "userId", {
    unique: false
});
```

This index allows efficient querying of notifications by user.

---

### session Store

```ts
db.createObjectStore("session", {
    keyPath: "key"
});
```

Used for storing:

```ts
{
  key: "currentUserId",
  value: string
}
```

---

# Session Management

## saveUserSession()

Stores the currently authenticated user.

```ts
saveUserSession(userId: string)
```

## Flow

1. Opens IndexedDB
2. Starts `readwrite` transaction
3. Stores current user ID

## Stored Data

```ts
{
  key: "currentUserId",
  value: userId
}
```

---

## clearUserSession()

Removes current session data.

```ts
clearUserSession()
```

## Purpose

* Clears logged-in user context
* Prevents notifications from being attached to old users

---

## getCurrentUserId()

Retrieves the currently logged-in user ID.

```ts
getCurrentUserId(): Promise<string | null>
```

## Return Values

| Value  | Meaning           |
| ------ | ----------------- |
| string | Logged-in user ID |
| null   | No active session |

---

# Notification Persistence

## addNotification()

Stores incoming notifications in IndexedDB.

```ts
addNotification(
    userId: string,
    notification: {
        title: string;
        body: string;
        icon?: string;
    }
)
```

## Stored Object

```ts
{
    userId,
    title,
    body,
    icon,
    timestamp,
    read: false
}
```

## Features

* Automatically timestamps notifications
* Defaults icon to `/icon.png`
* Stores notifications per user
* Marks notifications unread by default

---

# Notification Retrieval

## getUnreadNotifications()

Fetches unread notifications for a specific user.

```ts
getUnreadNotifications(userId: string)
```

## Process

1. Queries `notifications` store using `userId` index
2. Retrieves all user notifications
3. Filters unread notifications

## Returns

```ts
Promise<NotificationItem[]>
```

---

# Read Status Management

## markAllAsRead()

Marks all user notifications as read.

```ts
markAllAsRead(userId: string)
```

## Process

1. Opens cursor on `userId` index
2. Iterates through notifications
3. Updates unread records

---

# Firebase Notification System

## initializeNotifications()

Initializes Firebase messaging and notification handling.

```ts
initializeNotifications()
```

---

# Initialization Flow

## 1. Browser Capability Check

```ts
if (!('Notification' in window))
```

Ensures browser supports notifications.

---

## 2. Request Permission

```ts
const permission = await Notification.requestPermission();
```

Possible values:

| Permission | Meaning                |
| ---------- | ---------------------- |
| granted    | Notifications allowed  |
| denied     | Notifications blocked  |
| default    | User dismissed request |

---

## 3. Initialize Firebase Messaging

```ts
const messaging = getMessaging(app);
```

Uses Firebase app instance.

---

## 4. Retrieve FCM Token

```ts
getToken(messaging, {
  vapidKey
})
```

## Purpose

* Generates unique push token
* Identifies browser/device instance

---

# Foreground Notification Handling

## onMessage()

Listens for foreground push notifications.

```ts
onMessage(messaging, async (payload) => {})
```

---

# Foreground Notification Workflow

## Step 1: Receive Notification

Payload example:

```ts
{
  notification: {
    title,
    body,
    icon
  }
}
```

---

## Step 2: Persist Notification

```ts
await addNotification(userId, {
    title,
    body,
    icon
});
```

Notifications are saved locally for later retrieval.

---

## Step 3: Display Toast Notification

```ts
toast({
  title,
  description: body
});
```

Used for in-app UX.

---

## Step 4: Display System Notification

```ts
new Notification(title, options);
```

Shows browser-level desktop notification.

---

# Token Registration System

## registerNotificationToken()

Registers device notification token with backend.

```ts
registerNotificationToken(authToken: string)
```

---

# Registration Flow

## 1. Initialize Notifications

```ts
const notificationToken =
    await initializeNotifications();
```

---

## 2. Generate Device Fingerprint

```ts
const fp = await fpPromise.load();
const result = await fp.get();
const deviceId = result.visitorId;
```

## Purpose

Creates persistent device identity.

---

## 3. Send Registration Request

```ts
POST /notification/register
```

### Payload

```json
{
  "token": "fcm-token",
  "deviceId": "fingerprint-id"
}
```

### Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
```

---

# Login Notification Recovery

## handleLoginNotifications()

Processes unread notifications after user login.

```ts
handleLoginNotifications(userId: string)
```

---

# Workflow

## 1. Fetch Unread Notifications

```ts
const unread =
    await getUnreadNotifications(userId);
```

---

## 2. Display Notifications

### Single Notification

```ts
toast({
  title: n.title,
  description: n.body
});
```

---

### Multiple Notifications

```ts
toast({
  title: "New Notifications",
  description:
      `You have ${unread.length} new notifications.`
});
```

---

## 3. Mark Notifications Read

```ts
await markAllAsRead(userId);
```

---

# System Workflow Diagram

```text
Backend Server
      │
      ▼
Firebase Cloud Messaging
      │
      ▼
Browser Receives Notification
      │
      ▼
onMessage()
      │
 ┌────┴────┐
 ▼         ▼
Save      Show
IndexedDB Toast
 │          │
 ▼          ▼
Persist   UI Alert
 │
 ▼
User Login
 │
 ▼
Retrieve Unread Notifications
 │
 ▼
Display Notifications
 │
 ▼
Mark As Read
```

---

# IndexedDB Schema

## notifications Store

| Key | Type        |
| --- | ----------- |
| id  | Primary Key |

## Indexes

| Index  | Field  |
| ------ | ------ |
| userId | userId |

---

## session Store

| Key           | Value   |
| ------------- | ------- |
| currentUserId | user ID |

---

# Error Handling

## Database Errors

Handled using:

```ts
request.onerror
tx.onerror
tx.onabort
```

---

## Notification Errors

Handled using:

```ts
try/catch
console.error()
```

---

## Network Errors

Registration API failures:

```ts
if (!response.ok)
```

---

# Security Considerations

## Authentication

Notification registration requires:

```http
Authorization: Bearer <token>
```

---

## Device Identification

Uses FingerprintJS for:

* Device uniqueness
* Multi-device support
* Token tracking

---

## User Isolation

Notifications are stored using:

```ts
userId
```

Prevents cross-user notification access.

---

# Performance Considerations

## IndexedDB Advantages

* Asynchronous
* Non-blocking
* Large storage capacity
* Persistent across sessions

---

## Indexed Usage

Using:

```ts
store.index("userId")
```

Improves query performance.

---

# Browser Compatibility

## Required APIs

| API                | Requirement      |
| ------------------ | ---------------- |
| IndexedDB          | Required         |
| Notification API   | Required         |
| Service Workers    | Required for FCM |
| Firebase Messaging | Required         |

---

# Recommended Improvements

## 1. Pagination

Current implementation loads all notifications:

```ts
index.getAll(userId)
```

Large datasets may impact performance.

---

## 2. Read Status Index

Add index:

```ts
createIndex("read", "read")
```

Allows efficient unread queries.

---

## 3. Notification Expiry

Implement cleanup policy:

* Delete old notifications
* Limit maximum stored records

---

## 4. Multi-Tab Synchronization

Use:

```ts
BroadcastChannel
```

to sync notifications across tabs.

---

## 5. Service Worker Support

Extend support for:

* Background notifications
* Offline notification handling

---

# Example Usage

## Save User Session

```ts
await saveUserSession(user.id);
```

---

## Register Device

```ts
await registerNotificationToken(authToken);
```

---

## Handle Login Notifications

```ts
await handleLoginNotifications(user.id);
```

---

# Conclusion

This notification system provides:

* Persistent local notification storage
* Real-time Firebase messaging integration
* User-specific notification management
* Offline notification recovery
* Browser-native notification support

The architecture is scalable, modular, and suitable for modern Progressive Web Applications (PWAs) and web platforms requiring reliable client-side notification handling.
