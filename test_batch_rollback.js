import { pb } from './src/lib/pocketbase.ts';
console.log("Checking if Batch operations can ignore errors")
// PocketBase 0.22+ batch operations run inside a transaction on the server.
// The review raises a valid point about transactional rollback versus independent saves.
