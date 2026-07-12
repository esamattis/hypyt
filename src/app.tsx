import { Context, Hono } from "hono";
import { TrieRouter } from "hono/router/trie-router";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { jsxRenderer, useRequestContext } from "hono/jsx-renderer";
import { getCookie } from "hono/cookie";
import { ViteClient } from "vite-ssr-components/hono";
import { users } from "./schema";
import * as routes from "./routes";
import { parseUserOptions, type UserOptions } from "./options";

export type AppType = Hono<Env>;

export type AppRequestContext = Context<Env>;

export interface AppContext {
    db: ReturnType<typeof drizzle>;
    user: User | null;
    getUser(): User;
    requestContext: AppRequestContext;
    cssDupCache: Set<string>;
    jsDupCache: Set<(...args: any[]) => any>;
    url(): URL;
}

export interface User {
    username: string;
    uuid: string;
    displayName: string | null;
    email: string;
    options: UserOptions;
    getDisplayName(): string;
}

export interface Variables {
    appContext: AppContext;
}

export interface Env {
    Bindings: CloudflareBindings;
    Variables: Variables;
}

interface CachedFunction<T> {
    (c: AppContext): Promise<T>;
    clear: (c: AppContext) => void;
}

/**
 * Caches the result of a function call for the duration of the request.
 * If the function is called again with the same key, it will return the cached result.
 **/
export function cached<T>(
    _key: string,
    fn: (c: AppContext) => Promise<T>,
): CachedFunction<T> {
    const results = new WeakMap<AppContext, Promise<T>>();
    const cachedFn = async (c: AppContext) => {
        let result = results.get(c);
        if (!result) {
            result = fn(c);
            results.set(c, result);
        }
        return result;
    };

    cachedFn.clear = (c: AppContext) => {
        results.delete(c);
    };

    return cachedFn;
}

// The trie router remains mutable during Vite module reloads.
export const app = new Hono<Env>({ router: new TrieRouter() });

export function getAppContext(c: AppRequestContext): AppContext {
    if (!c.var.appContext) {
        throw new Error("App context not set in request context");
    }
    return c.var.appContext;
}

export function useAppContext(): AppContext {
    const c = useRequestContext<Env>();
    return getAppContext(c);
}

function errorHandler(err: Error, c: AppRequestContext) {
    return c.render(
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm ring-1 ring-red-100">
            <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-red-100 text-xl">
                    ⚠
                </div>
                <div className="min-w-0">
                    <h1 className="text-lg font-bold text-red-700">
                        An error occurred
                    </h1>
                    <p className="mt-1 break-words text-sm text-red-900">
                        <strong>Message:</strong> {err.message}
                    </p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-red-500">
                        Stack
                    </p>
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-white/80 p-3 text-xs text-red-900 ring-1 ring-red-200">
                        {err.stack}
                    </pre>
                </div>
            </div>
        </div>,
    );
}

app.onError(errorHandler);

async function setAppContextMiddleware(
    c: AppRequestContext,
    next: () => Promise<void>,
) {
    c.set("appContext", {
        db: drizzle(c.env.DB),
        user: null,
        getUser() {
            const user = this.user;
            if (!user) {
                throw new Error("No user set in context");
            }
            return user;
        },
        requestContext: c,
        cssDupCache: new Set(),
        jsDupCache: new Set(),
        url() {
            const host = c.req.header("host");
            if (host) {
                return new URL(c.req.url, `https://${host}`);
            }
            return new URL(c.req.url);
        },
    });
    await next();
}

app.use("*", setAppContextMiddleware);

const PUBLIC_PATHS = [routes.login.route, routes.register.route];
const STATIC_PATH_PATTERN = /\.(css|js|png|ico|json|webmanifest|svg|woff2?)$/;

async function authenticateMiddleware(
    c: AppRequestContext,
    next: () => Promise<void>,
) {
    const path = c.req.path;

    if (STATIC_PATH_PATTERN.test(path)) {
        return next();
    }

    const ctx = getAppContext(c);
    const sessionUuid = getCookie(c, "session");

    if (sessionUuid) {
        const userRow = await ctx.db
            .select({
                uuid: users.uuid,
                username: users.username,
                displayName: users.displayName,
                email: users.email,
                options: users.options,
            })
            .from(users)
            .where(eq(users.uuid, sessionUuid))
            .limit(1)
            .get();

        if (userRow) {
            ctx.user = {
                uuid: userRow.uuid,
                username: userRow.username,
                displayName: userRow.displayName || null,
                email: userRow.email,
                options: parseUserOptions(userRow.options),
                getDisplayName() {
                    return userRow.displayName || userRow.username;
                },
            };
        }
    }

    const isPublicPath = PUBLIC_PATHS.some((publicPath) => publicPath === path);
    if (!ctx.user && !isPublicPath) {
        return c.redirect(routes.login({}, { back: path }));
    }

    await next();
}

app.use("*", authenticateMiddleware);

app.use(
    "*",
    jsxRenderer((props, c) => {
        // fragment for htmx
        if (c.req.path.includes("__")) {
            return <>{props.children}</>;
        }

        const user = getAppContext(c).user;

        const title = user
            ? `${user.getDisplayName()} – Jump Logbook`
            : "Jump Logbook";

        return (
            <html lang="en">
                <head>
                    <meta charSet="UTF-8" />
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1.0"
                    />
                    <ViteClient />
                    <link rel="icon" href="/icon.png" />
                    <link
                        rel="apple-touch-icon"
                        sizes="72x72"
                        href="/apple-72x72.png"
                    />
                    <link
                        rel="apple-touch-icon"
                        sizes="144x144"
                        href="/apple-144x144.png"
                    />

                    <title>{title}</title>
                    <link
                        id="tailwind"
                        href="/src/tailwind.css?direct"
                        rel="stylesheet"
                    />
                    <script src="/htmx.js" module></script>
                </head>
                <body
                    style={{
                        ["--animation-duration"]: "5000ms",
                    }}
                    className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased"
                >
                    <div className="min-h-screen">{props.children}</div>
                </body>
            </html>
        );
    }),
);
