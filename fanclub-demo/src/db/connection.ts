import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { demoConfig } from '../config.js';
// ESM replacement for __dirname, so schema.sql is found relative to this file.
const thisDir = path.dirname(fileURLToPath(import.meta.url));
export function openDb(): Database.Database {
  fs.mkdirSync(path.dirname(demoConfig.dbPath), { recursive: true });
  const db = new Database(demoConfig.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
export function applySchema(db: Database.Database): void {
  db.exec(fs.readFileSync(path.join(thisDir, 'schema.sql'), 'utf8'));
}
export function isSeeded(db: Database.Database): boolean {
  return !!db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tickets'`).get();
}
