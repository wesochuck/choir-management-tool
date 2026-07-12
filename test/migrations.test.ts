import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('pocketbase/pb_migrations contains only standard javascript (.js) files', () => {
  const migrationsDir = path.resolve(
    import.meta.dirname || __dirname || '.',
    '../pocketbase/pb_migrations'
  );

  if (!fs.existsSync(migrationsDir)) {
    // If the directory doesn't exist, we don't have migrations, which is fine, but let's assert ok.
    assert.ok(true);
    return;
  }

  const files = fs.readdirSync(migrationsDir);
  const nonJsFiles = files.filter((file) => {
    // Check if it's a directory or a file that doesn't end with .js
    const fullPath = path.join(migrationsDir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      return true; // No subdirectories allowed in pb_migrations
    }

    return !file.endsWith('.js');
  });

  if (nonJsFiles.length > 0) {
    assert.fail(
      `CRITICAL ERROR: Found non-.js or invalid files/directories in pocketbase/pb_migrations:\n` +
        nonJsFiles.map((f) => `  - ${f}`).join('\n') +
        `\n\nPocketBase will attempt to execute these files and crash. ` +
        `Keep types, utility, config, or helper files in the parent 'pocketbase/' directory, NOT in 'pb_migrations/'.`
    );
  }

  assert.ok(true, 'All files in pb_migrations are standard .js files');
});

test('file upload fields are represented by source-controlled migrations', () => {
  const migrationsDir = path.resolve(
    import.meta.dirname || __dirname || '.',
    '../pocketbase/pb_migrations'
  );
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
  const migrationSource = migrationFiles.join('\n');

  assert.match(migrationSource, /new FileField\(\{[\s\S]*name:\s*"photo"/);
  assert.match(migrationSource, /new FileField\(\{[\s\S]*name:\s*"audioFiles"/);
});

function readMigration(filename: string): string {
  return fs.readFileSync(
    path.resolve(
      import.meta.dirname || __dirname || '.',
      `../pocketbase/pb_migrations/${filename}`
    ),
    'utf8'
  );
}

test('first-run migration backfills existing installs without changing schemas', () => {
  const migration = readMigration('1783814400_add_setup_and_modules.js');
  assert.match(migration, /key:\s*['"]setup_state['"]/);
  assert.match(migration, /key:\s*['"]module_state['"]/);
  assert.match(migration, /role = ['"]admin['"]/);
  assert.match(migration, /initialized:\s*hasAdmin/);
  assert.doesNotMatch(migration, /save\(collection\)|new Collection/);
});
