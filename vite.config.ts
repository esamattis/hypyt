import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig, type PluginOption } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    build: {
        emptyOutDir: false,
        ssr: "src/index.tsx",
    },
    plugins: [
        cloudflare({
            persistState: {
                path: process.env.PLAYWRIGHT_TEST
                    ? ".playwright/state"
                    : ".wrangler/state",
            },
        }),
        ssrPlugin(),
        tailwindcss(),
    ] satisfies PluginOption[],
});
