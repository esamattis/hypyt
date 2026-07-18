import { readMigrationFiles, type MigrationMeta } from "drizzle-orm/migrator";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { getAsset, getAssetKeys, isSea } from "node:sea";
import type { DatabaseSync } from "node:sqlite";

function migrationTimestamp(name: string): number {
    const date = name.slice(0, 14);
    return Date.UTC(
        Number(date.slice(0, 4)),
        Number(date.slice(4, 6)) - 1,
        Number(date.slice(6, 8)),
        Number(date.slice(8, 10)),
        Number(date.slice(10, 12)),
        Number(date.slice(12, 14)),
    );
}

function readSeaMigrationFiles(): MigrationMeta[] {
    return getAssetKeys()
        .flatMap((key) => {
            const match = /^drizzle\/([^/]+)\/migration\.sql$/.exec(key);
            return match?.[1] ? [{ key, name: match[1] }] : [];
        })
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((migration) => {
            const query = getAsset(migration.key, "utf8");
            return {
                sql: query.split("--> statement-breakpoint"),
                bps: true,
                folderMillis: migrationTimestamp(migration.name),
                hash: createHash("sha256").update(query).digest("hex"),
                name: migration.name,
            };
        });
}

/**
 * Apply Drizzle migrations to node:sqlite.
 * Splits multi-statement migration chunks (some historical files omit
 * statement-breakpoint separators that D1 tolerates but node:sqlite rejects).
 */
export function migrateSqlite(
    sqlite: DatabaseSync,
    migrationsFolder = resolve("drizzle"),
): void {
    const migrations = isSea()
        ? readSeaMigrationFiles()
        : readMigrationFiles({ migrationsFolder });

    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hash text NOT NULL,
            created_at numeric,
            name text,
            applied_at TEXT
        );
    `);

    const appliedRows = sqlite
        .prepare(`SELECT name FROM \`__drizzle_migrations\``)
        .all();
    const applied = new Set(appliedRows.map((row) => String(row.name)));

    const insertMigration = sqlite.prepare(
        `INSERT INTO \`__drizzle_migrations\` (\`hash\`, \`created_at\`, \`name\`, \`applied_at\`) VALUES (?, ?, ?, ?)`,
    );

    for (const migration of migrations) {
        if (applied.has(migration.name)) {
            continue;
        }

        sqlite.exec("BEGIN");
        try {
            for (const query of migration.sql) {
                for (const statement of splitSqlStatements(query)) {
                    sqlite.exec(statement);
                }
            }
            insertMigration.run(
                migration.hash,
                migration.folderMillis,
                migration.name,
                new Date().toISOString(),
            );
            sqlite.exec("COMMIT");
        } catch (error) {
            sqlite.exec("ROLLBACK");
            throw error;
        }
    }
}

function splitSqlStatements(sql: string): string[] {
    return sql
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}
