import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { getAsset, getAssetKeys, isSea } from "node:sea";
import type { DatabaseSync } from "node:sqlite";

function extractSeaMigrations(directory: string): void {
    for (const key of getAssetKeys()) {
        const match = /^drizzle\/([^/]+)\/migration\.sql$/.exec(key);
        if (!match?.[1]) {
            continue;
        }

        const migrationDirectory = join(directory, match[1]);
        mkdirSync(migrationDirectory);
        writeFileSync(
            join(migrationDirectory, "migration.sql"),
            getAsset(key, "utf8"),
        );
    }
}

export function migrateSqlite(
    sqlite: DatabaseSync,
    migrationsFolder = resolve("drizzle"),
): void {
    const db = drizzle({ client: sqlite });
    if (isSea()) {
        const directory = mkdtempSync(join(tmpdir(), "loki-migrations-"));
        try {
            extractSeaMigrations(directory);
            migrate(db, { migrationsFolder: directory });
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
        return;
    }

    migrate(db, { migrationsFolder });
}
