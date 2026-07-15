import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { wranglerBin } from "./wrangler-bin.ts";

const execFile = promisify(execFileCallback);
const adminUuid = "00000000-0000-4000-8000-000000000001";
const adminUsername = "test-admin";
const adminPassword = "test-admin-password";
const pbkdf2Iterations = 100_000;

type MigrationJournal = {
    entries: Array<{ tag: string }>;
};

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

async function hashPassword(value: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(value),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const derived = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations: pbkdf2Iterations,
            hash: "SHA-256",
        },
        keyMaterial,
        256,
    );
    return `${pbkdf2Iterations}:${bytesToBase64(salt)}:${bytesToBase64(new Uint8Array(derived))}`;
}

async function main(): Promise<void> {
    const journal: MigrationJournal = JSON.parse(
        await readFile("drizzle/meta/_journal.json", "utf8"),
    );

    for (const { tag } of journal.entries) {
        const { stdout, stderr } = await execFile(process.execPath, [
            wranglerBin(),
            "d1",
            "execute",
            "DB",
            "--local",
            "--persist-to",
            ".playwright/state",
            "--file",
            `drizzle/${tag}.sql`,
        ]);
        process.stdout.write(stdout);
        process.stderr.write(stderr);
    }

    const passwordHash = await hashPassword(adminPassword);
    const seed = await execFile(process.execPath, [
        wranglerBin(),
        "d1",
        "execute",
        "DB",
        "--local",
        "--persist-to",
        ".playwright/state",
        "--command",
        `INSERT INTO invitations (code, count) VALUES ('test-invite', 1000000); INSERT INTO users (uuid, username, display_name, password, email, admin) VALUES ('${adminUuid}', '${adminUsername}', 'Test Admin', '${passwordHash}', 'test-admin@example.test', 1)`,
    ]);
    process.stdout.write(seed.stdout);
    process.stderr.write(seed.stderr);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
