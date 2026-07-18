import { drizzle as drizzleSqlite } from "drizzle-orm/node-sqlite";
import { chmodSync, closeSync, mkdirSync, openSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, posix, resolve, win32 } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AppDatabase } from "@/db";

export function defaultSqliteDirectory(
    platform: NodeJS.Platform = process.platform,
    environment: NodeJS.ProcessEnv = process.env,
    home = homedir(),
): string {
    if (platform === "win32") {
        const localAppData = environment.LOCALAPPDATA?.trim();
        return win32.join(
            localAppData || win32.join(home, "AppData", "Local"),
            "Loki",
            "sqlite",
        );
    }

    return posix.join(home, ".local", "share", "loki", "sqlite");
}

export function resolveSqlitePath(path = process.env.SQLITE_PATH): string {
    return resolve(
        path?.trim() || join(defaultSqliteDirectory(), "loki.sqlite"),
    );
}

type BatchableQuery = {
    run?: () => unknown;
    all?: () => unknown;
    get?: () => unknown;
    execute?: () => unknown;
};

function runBatchQuery(query: BatchableQuery): unknown {
    if (typeof query.run === "function") {
        return query.run();
    }
    if (typeof query.all === "function") {
        return query.all();
    }
    if (typeof query.get === "function") {
        return query.get();
    }
    if (typeof query.execute === "function") {
        return query.execute();
    }
    throw new Error("Unsupported batch query");
}

function prepareSqliteStorage(path: string): void {
    const directory = dirname(path);
    if (process.platform === "win32") {
        // LOCALAPPDATA inherits the current user's Windows ACLs.
        mkdirSync(directory, { recursive: true });
        return;
    }

    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    const descriptor = openSync(path, "a", 0o600);
    closeSync(descriptor);
    chmodSync(path, 0o600);
}

/**
 * Build a Drizzle client against node:sqlite, with a D1-compatible `batch`.
 */
export function createSqliteDatabase(path = resolveSqlitePath()): {
    db: AppDatabase;
    sqlite: DatabaseSync;
    path: string;
} {
    const absolutePath = resolve(path);
    prepareSqliteStorage(absolutePath);
    const sqlite = new DatabaseSync(absolutePath);
    sqlite.exec("PRAGMA journal_mode = WAL");
    sqlite.exec("PRAGMA foreign_keys = ON");

    // Shared SQLite dialect; cast to the app's D1-shaped client type.
    const drizzleDb = drizzleSqlite({ client: sqlite });
    Object.assign(drizzleDb, {
        batch: async function batch(queries: BatchableQuery[]) {
            sqlite.exec("BEGIN");
            try {
                const results = queries.map((query) => runBatchQuery(query));
                sqlite.exec("COMMIT");
                return results;
            } catch (error) {
                sqlite.exec("ROLLBACK");
                throw error;
            }
        },
    });
    const db = drizzleDb as unknown as AppDatabase;

    return {
        db,
        sqlite,
        path: absolutePath,
    };
}
