const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = '/Users/wesosborn/Downloads/choir-management-tool/pocketbase/pb_data/data.db';
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  // Inspect events
  db.all("SELECT id, title, setList FROM events", (err, rows) => {
    if (err) {
      console.error('Error querying events:', err);
      return;
    }
    console.log('=== EVENTS ===');
    rows.forEach(r => {
      console.log(`Event ID: ${r.id}, Title: ${r.title}`);
      console.log(`SetList: ${r.setList}`);
      console.log('-----------------');
    });
  });

  // Inspect musicLibrary
  db.all("SELECT id, parentId, title, composer, audioTrackMapping FROM musicLibrary", (err, rows) => {
    if (err) {
      console.error('Error querying musicLibrary:', err);
      return;
    }
    console.log('=== MUSIC LIBRARY ===');
    rows.forEach(r => {
      console.log(`Piece ID: ${r.id}, ParentID: ${r.parentId}, Title: ${r.title}, Composer: ${r.composer}`);
      console.log(`AudioTrackMapping: ${r.audioTrackMapping}`);
      console.log('-----------------');
    });
    db.close();
  });
});
