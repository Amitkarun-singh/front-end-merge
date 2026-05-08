// // Open database
// const request = window.indexedDB.open("schools2ai", 3);

// let db: IDBDatabase;

// request.onerror = (event) => {
//   console.error("IndexedDB error");
// };

// // Runs ONLY when database is created or version changes
// request.onupgradeneeded = (event) => {
//   db = (event.target as IDBOpenDBRequest).result;

//   // Create object store only if it doesn't exist
//   if (!db.objectStoreNames.contains("schools2ai")) {
//     db.createObjectStore("schools2ai", {
//       keyPath: "id",
//   autoIncrement: true,
//     });
//   }
// };

// // Runs after DB is successfully opened
// request.onsuccess = (event) => {
//   db = (event.target as IDBOpenDBRequest).result;

//   db.onerror = (event) => {
//     console.error(
//       `Database error: ${(event.target as IDBRequest).error?.message}`
//     );
//   };

//   console.log("Database opened successfully");

//   const tx = db.transaction("schools2ai", "readwrite");
// const store = tx.objectStore("schools2ai");

// store.add({ name: "class" });``
// };
