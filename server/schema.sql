PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('buyer','vendor','admin')),
 store_name TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, extension TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS products (
 id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, description TEXT NOT NULL,
 category TEXT NOT NULL, price INTEGER NOT NULL CHECK(price>=0), format TEXT NOT NULL, polygons INTEGER NOT NULL DEFAULT 0,
 rigged INTEGER NOT NULL DEFAULT 0, file_id TEXT NOT NULL REFERENCES files(id), image_id TEXT REFERENCES files(id),
 preview_kind TEXT NOT NULL DEFAULT 'upload', status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected','archived')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS cart (user_id TEXT NOT NULL REFERENCES users(id), product_id TEXT NOT NULL REFERENCES products(id), PRIMARY KEY(user_id,product_id));
CREATE TABLE IF NOT EXISTS wishlist (user_id TEXT NOT NULL REFERENCES users(id), product_id TEXT NOT NULL REFERENCES products(id), PRIMARY KEY(user_id,product_id));
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), total INTEGER NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('demo','free')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items (order_id TEXT NOT NULL REFERENCES orders(id), product_id TEXT NOT NULL REFERENCES products(id), price INTEGER NOT NULL, PRIMARY KEY(order_id,product_id));
CREATE INDEX IF NOT EXISTS products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS products_status ON products(status);
CREATE INDEX IF NOT EXISTS orders_buyer ON orders(user_id);
