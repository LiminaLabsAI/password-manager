-- AlterTable
-- Per-user Argon2id salt (16 bytes). Required at signup; NOT NULL.
-- Adding without a default would fail on a populated table, but the table
-- is empty pre-release. Safe to add NOT NULL directly.
ALTER TABLE "User" ADD COLUMN "salt" BYTEA NOT NULL;