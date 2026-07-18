import { defineConfig } from "drizzle-kit";
import { $ } from "zx";
import { wranglerBin } from "./scripts/wrangler-bin.ts";

const DATABASE_ID = "3411ed1b-a253-4f19-a054-beaf2ea0f616";

type WranglerWhoAmI = {
    accounts: { id: string }[];
};

type WranglerAuth = {
    token?: string;
};

const $$ = $({ sync: true, quiet: true });
const whoAmI: WranglerWhoAmI = JSON.parse(
    $$`${process.execPath} ${[wranglerBin(), "whoami", "--json"]}`.stdout,
);
const account = whoAmI.accounts[0];
if (!account || whoAmI.accounts.length !== 1) {
    throw new Error(
        `Expected one Cloudflare account, found ${whoAmI.accounts.length}`,
    );
}
const auth: WranglerAuth = JSON.parse(
    $$`${process.execPath} ${[wranglerBin(), "auth", "token", "--json"]}`
        .stdout,
);
if (!auth.token) {
    throw new Error("Wrangler authentication does not provide a token");
}

export default defineConfig({
    dialect: "sqlite",
    driver: "d1-http",
    schema: "./src/schema.ts",
    out: "./drizzle",
    dbCredentials: {
        accountId: account.id,
        databaseId: DATABASE_ID,
        token: auth.token,
    },
});
