import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { demoConfig } from '../config';
export function openDb(): Database.Database {
  fs.mkdirSync(path.dirname(demoConfig.dbPath), { recursive: true });
  const db = new Database(demoConfig.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
export function applySchema(db: Database.Database): void {
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
}
export function isSeeded(db: Database.Database): boolean {
  return !!db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tickets'`).get();
}
