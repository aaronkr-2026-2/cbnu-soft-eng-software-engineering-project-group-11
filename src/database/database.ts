import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS films (
      id TEXT PRIMARY KEY NOT NULL,
      brand TEXT NOT NULL,
      name TEXT NOT NULL,
      iso INTEGER NOT NULL,
      format TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rolls (
      id TEXT PRIMARY KEY NOT NULL,
      film_id TEXT NOT NULL,
      camera_id TEXT,
      frames INTEGER NOT NULL,
      shot_at TEXT,
      location TEXT,
      notes TEXT,
      FOREIGN KEY (film_id) REFERENCES films(id),
      FOREIGN KEY (camera_id) REFERENCES cameras(id)
    );

    CREATE TABLE IF NOT EXISTS photo_references (
      id TEXT PRIMARY KEY NOT NULL,
      roll_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_asset_id TEXT NOT NULL,
      local_identifier TEXT,
      frame_number INTEGER,
      FOREIGN KEY (roll_id) REFERENCES rolls(id) ON DELETE CASCADE
    );
  `);
}
