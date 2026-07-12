import { execFile as execFileCallback } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const migrationsFolder = "drizzle";

async function getMigrationFiles(): Promise<string[]> {
    const entries = await readdir(migrationsFolder, { withFileTypes: true });
    const migrationFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
        .map((entry) => entry.name)
        .sort();

    if (migrationFiles.length === 0) {
        throw new Error(`No migration files found in ${migrationsFolder}.`);
    }

    return migrationFiles;
}

async function main(): Promise<void> {
    const migrationFiles = await getMigrationFiles();

    for (const migrationFile of migrationFiles) {
        console.log(`Running remote migration: ${migrationFile}`);
        const { stdout, stderr } = await execFile("wrangler", [
            "d1",
            "execute",
            "DB",
            "--remote",
            "--file",
            join(migrationsFolder, migrationFile),
        ]);
        process.stdout.write(stdout);
        process.stderr.write(stderr);
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
