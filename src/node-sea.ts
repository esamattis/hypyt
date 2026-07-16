import type { App } from "@/app/app";
import { createHash } from "node:crypto";
import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join } from "node:path";
import { getAsset, getAssetKeys, isSea } from "node:sea";
import { tmpdir } from "node:os";

const CONTENT_TYPES: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
};

function seaNativeBindingPath(): string {
    // A native Node addon cannot be loaded directly from a SEA asset. Extract it
    // to the filesystem so createRequire() can pass its path to the OS loader.
    // The content hash lets every process and subsequent launch reuse the same
    // file, leaving at most one temporary file per better-sqlite3 addon build.
    // We keep the file because Windows cannot delete a loaded native module.
    const binding = new Uint8Array(getAsset("native/better_sqlite3.node"));
    const hash = createHash("sha256").update(binding).digest("hex");
    const path = join(tmpdir(), `loki-better-sqlite3-${hash}.node`);
    if (!existsSync(path)) {
        // Publish a complete file atomically. Concurrent launches may race to
        // rename identical files; on Windows, the loser sees the winner's file.
        const temporaryPath = `${path}.${process.pid}.tmp`;
        writeFileSync(temporaryPath, binding);
        try {
            renameSync(temporaryPath, path);
        } catch (error) {
            if (!existsSync(path)) {
                throw error;
            }
        } finally {
            rmSync(temporaryPath, { force: true });
        }
    }
    return path;
}

export function loadNodeNativeBinding(): object {
    const require = createRequire(import.meta.url);
    const path = isSea()
        ? seaNativeBindingPath()
        : require.resolve("better-sqlite3/build/Release/better_sqlite3.node");
    const binding: unknown = require(path);
    if (!binding || typeof binding !== "object") {
        throw new Error("Could not load the SQLite native addon");
    }
    return binding;
}

export function registerSeaStaticAssets(app: App): boolean {
    if (!isSea()) {
        return false;
    }

    const assetKeys = new Set(getAssetKeys());
    app.use("/*", async (c, next) => {
        const key = `client${c.req.path}`;
        if (!assetKeys.has(key)) {
            return next();
        }

        return c.body(getAsset(key), 200, {
            "Content-Type":
                CONTENT_TYPES[extname(c.req.path)] ??
                "application/octet-stream",
        });
    });
    return true;
}
