// `getPlatformProxy({ remoteBindings: true })` only uses remote D1 when the
// binding has `remote: true`. Shelling out guarantees this targets production.
import { readMigrationFiles, type MigrationMeta } from "drizzle-orm/migrator";
import { $ } from "zx";
import { wranglerBin } from "./wrangler-bin.ts";

const DB_BINDING = "DB";
const MIGRATIONS_TABLE = "__drizzle_migrations";
const MIGRATIONS_FOLDER = "drizzle";

type WranglerEnvelope<T> = {
    results: T[];
    success: boolean;
};

async function wranglerQuery<T = unknown>(
    command: string,
): Promise<WranglerEnvelope<T>> {
    const { stdout } = await $`${process.execPath} ${[
        wranglerBin(),
        "d1",
        "execute",
        DB_BINDING,
        "--remote",
        "--json",
        "--command",
        command,
    ]}`;
    const parsed: WranglerEnvelope<T>[] = JSON.parse(stdout);
    const [envelope] = parsed;
    if (!envelope) {
        throw new Error("Wrangler returned no result envelope");
    }
    return envelope;
}

async function wranglerApplyFile(filePath: string): Promise<void> {
    // File uploads mix progress text into stdout, so rely on the exit code.
    await $`${process.execPath} ${[
        wranglerBin(),
        "d1",
        "execute",
        DB_BINDING,
        "--remote",
        "--file",
        filePath,
    ]}`;
}

function sqlString(value: string): string {
    return `'${value.replaceAll("'", "''")}'`;
}

async function ensureMigrationsTable(): Promise<void> {
    await wranglerQuery(
        `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric, name text, applied_at TEXT)`,
    );
}

async function getAppliedNames(): Promise<Set<string>> {
    const result = await wranglerQuery<{ name: string }>(
        `SELECT name FROM ${MIGRATIONS_TABLE}`,
    );
    return new Set(result.results.map((row) => row.name));
}

async function recordMigration(migration: MigrationMeta): Promise<void> {
    await wranglerQuery(
        `INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at, name, applied_at) VALUES (${sqlString(migration.hash)}, ${migration.folderMillis}, ${sqlString(migration.name)}, ${sqlString(new Date().toISOString())})`,
    );
}

async function applyMigration(migration: MigrationMeta): Promise<void> {
    console.log(`Applying migration ${migration.name}...`);
    await wranglerApplyFile(
        `${MIGRATIONS_FOLDER}/${migration.name}/migration.sql`,
    );
    await recordMigration(migration);
    console.log(`  Applied ${migration.name}`);
}

async function main(): Promise<void> {
    const migrations = readMigrationFiles({
        migrationsFolder: MIGRATIONS_FOLDER,
    });
    await ensureMigrationsTable();
    const applied = await getAppliedNames();
    const pending = migrations.filter(
        (migration) => !applied.has(migration.name),
    );

    if (pending.length === 0) {
        console.log("Remote database is up to date. No pending migrations.");
        return;
    }

    for (const migration of pending) {
        await applyMigration(migration);
    }
    console.log(`Applied ${pending.length} migration(s) to remote database.`);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
