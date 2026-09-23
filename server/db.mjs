import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export const dataDir = resolve(process.env.DATA_DIR || './data');
mkdirSync(resolve(dataDir, 'files'), { recursive: true });
export const db = new DatabaseSync(resolve(dataDir, 'marketplace.sqlite'));
db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
export const one = (sql, ...args) => db.prepare(sql).get(...args);
export const many = (sql, ...args) => db.prepare(sql).all(...args);
export const run = (sql, ...args) => db.prepare(sql).run(...args);
export function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result=fn(); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; } }
