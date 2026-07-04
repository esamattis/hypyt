import { AppRequestContext, useAppContext } from "../app";

function djb2Checksum(input: string): number {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = (hash << 5) + hash + input.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

const nameCache = new WeakMap<(...args: any[]) => any, string>();

function getGlobalName(fn: (...args: any[]) => any): string {
    const cachedName = nameCache.get(fn);
    if (cachedName) {
        return cachedName;
    }

    const fnName = (fn as any).displayName || fn.name;
    const checksum = djb2Checksum(fn.toString()).toString(16);
    const name = fnName ? `__${fnName}_${checksum}` : `__${checksum}`;
    nameCache.set(fn, name);
    return name;
}

export function Script<T extends readonly unknown[] = []>(props: {
    $exec: (...args: T) => void;
    $deps?: ((...args: any[]) => void)[];
    $args?: T;
}) {
    const jsDupCache = useAppContext().jsDupCache;

    let depsCode = "";

    for (const dep of props.$deps ?? []) {
        if (!dep.name) {
            throw new Error(
                "All client dependencies must have a function name: " +
                    dep.toString(),
            );
        }
        if (!jsDupCache.has(dep)) {
            jsDupCache.add(dep);
            depsCode += `${getGlobalName(dep)} = ${dep.toString()};\n`;
        }
    }

    // The $exec function is also kinda a dependency, as it needs to added only
    // once on the page even if it is used multiple times.
    if (!jsDupCache.has(props.$exec)) {
        jsDupCache.add(props.$exec);

        for (const dep of props.$deps ?? []) {
            const globalName = getGlobalName(dep);
            depsCode += `const ${dep.name} = ${globalName};\n`;
        }

        depsCode += `${getGlobalName(props.$exec)} = ${props.$exec.toString()};\n`;
    }

    if (depsCode !== "") {
        depsCode = `
            (()=> {
                const __name = (a) => a;
                ${depsCode}
            })();
        `;
    }

    const args = props.$args?.map((a) => JSON.stringify(a)).join(", ") ?? "";
    const execCode = `${getGlobalName(props.$exec)}(${args});`;

    return (
        <script
            dangerouslySetInnerHTML={{ __html: `\n${depsCode}\n${execCode}\n` }}
        />
    );
}

export function css(
    strings: TemplateStringsArray,
    ...values: unknown[]
): string {
    return strings.reduce((result, string, i) => {
        return result + string + (values[i] ?? "");
    }, "");
}

export function Style(props: {
    children: ((css_: typeof css) => string) | string;
}) {
    const cssDubCache = useAppContext().cssDupCache;

    const cssString =
        typeof props.children === "string"
            ? props.children
            : props.children(css);

    if (cssDubCache.has(cssString)) {
        // Skip css if already rendered at least once on this page
        return <></>;
    }

    cssDubCache.add(cssString);

    return (
        <style
            dangerouslySetInnerHTML={{
                __html: cssString,
            }}
        />
    );
}

Style.css = css;

export function _routeTypeTests() {
    const home = route("/");
    // @ts-expect-error TODO: Fix this
    home();

    // @ts-expect-error No route parameters
    home({ sdf: "asd" });
    const userProfile = route("/user/:username");

    userProfile({ username: "testuser" });
    userProfile({ username: 3 });
    // @ts-expect-error Invalid route parameter type
    userProfile({ username: {} });

    const search = route("/search").query<{ q: string }>();

    search({}, { q: "testuser" });

    // @ts-expect-error Invalid query parameter type
    search({}, { q: {} });

    // @ts-expect-error missing args
    search();
    // @ts-expect-error missing args
    search({});
    // @ts-expect-error missing args
    search({}, {});
}

type ExtractRouteParams<T extends string> =
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    T extends `${infer _Start}:${infer Param}/${infer Rest}`
        ? { [K in Param]: string } & ExtractRouteParams<`/${Rest}`>
        : // eslint-disable-next-line @typescript-eslint/no-unused-vars
          T extends `${infer _Start}:${infer Param}`
          ? { [K in Param]: string | number }
          : { __empty?: never } | undefined | null;

type StringifyValues<T> = {
    [K in keyof T]: string;
};

export function route<T extends string>(route: T) {
    function to(params: ExtractRouteParams<T>): string;
    function to<Q extends Record<string, any>>(
        params: ExtractRouteParams<T>,
        queryParams: Q,
    ): string;
    function to<Q extends Record<string, any>>(
        params: ExtractRouteParams<T>,
        queryParams?: Q,
    ): string {
        const paramsAny = params as Record<string, string>;
        let url = route.replace(/:(\w+)/g, (_, key) => {
            if (paramsAny[key] === undefined) {
                throw new Error(
                    `Route parameter "${key}" is required but not provided. Required in route: ${route}`,
                );
            }
            return encodeURIComponent(paramsAny[key]);
        });

        if (queryParams) {
            const searchParams = new URLSearchParams();
            Object.entries(queryParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        return url;
    }

    function query<Q extends Record<string, any>>() {
        const queryWrapped = (
            params: ExtractRouteParams<T>,
            queryParams: Q,
        ): string => {
            return to(params, queryParams);
        };

        queryWrapped.route = route;
        queryWrapped.params = (
            c: AppRequestContext,
        ): StringifyValues<ExtractRouteParams<T>> => {
            return c.req.param() as any;
        };

        // get query params
        queryWrapped.query = (c: AppRequestContext): Partial<Q> => {
            return c.req.query() as any;
        };

        return queryWrapped;
    }

    to.route = route;
    to.params = (
        c: AppRequestContext,
    ): StringifyValues<ExtractRouteParams<T>> => {
        return c.req.param() as any;
    };

    to.query = query;

    return to;
}
