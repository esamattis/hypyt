/**
 * Minimal browser-side JSX support for functions serialized by `Script`.
 *
 * Add `$render` to `$deps` before using JSX inside `$exec`:
 *
 *     <Script
 *         $deps={[$render]}
 *         $exec={() => {
 *             const html = $render(<div>Hello</div>);
 *         }}
 *     />
 *
 * `Function.toString()` does not preserve the Hono JSX runtime imported by
 * Vite. `Script` therefore injects the factories below and normalizes the
 * runtime references currently emitted in development and production. This is
 * coupled to Vite's generated function source.
 *
 * Known brittleness:
 *
 * - Development currently emits `(0,__vite_ssr_import_N__.jsxDEV)` calls.
 * - Production currently emits Rollup aliases such as `jsx$1` and `jsxDEV$1`.
 * - `Function.toString()` output and those generated names are not stable APIs.
 * - Minification or changes to Vite, Rollup, Hono, the JSX config, or plugin
 *   ordering can produce source that `script.tsx` does not normalize.
 * - The standard Playwright suite uses the development server, so it does not
 *   catch production-only compilation regressions.
 *
 * When changing the toolchain, test a JSX-using `Script` through both the
 * development server and a production preview. If browser output still
 * contains `__vite_ssr_import_` or an unresolved JSX factory, update the
 * normalization in `script.tsx` rather than adding another renderer workaround.
 *
 * This intentionally supports only HTML strings needed by small client
 * snippets: intrinsic elements, fragments, arrays, synchronous function
 * components, attributes, style objects, and escaped text. Event props are
 * omitted, and SVG namespaces, asynchronous components, and complete Hono JSX
 * semantics are not supported. Imported function components must also be
 * listed in `$deps`. Prefer a normal Vite client entry for larger or reusable
 * client interfaces because it preserves imports without source rewriting.
 */
type ClientJsxTag = string | ((props: Record<string, unknown>) => unknown);

interface ClientJsxNode {
    tag: ClientJsxTag;
    props: Record<string, unknown>;
}

// These names match the automatic JSX runtime calls emitted in dev and builds.
function jsxDEV(
    tag: ClientJsxTag,
    props: Record<string, unknown> | null,
): ClientJsxNode {
    return { tag, props: props ?? {} };
}

function jsx(
    tag: ClientJsxTag,
    props: Record<string, unknown> | null,
): ClientJsxNode {
    return { tag, props: props ?? {} };
}

function jsxs(
    tag: ClientJsxTag,
    props: Record<string, unknown> | null,
): ClientJsxNode {
    return { tag, props: props ?? {} };
}

function Fragment(props: Record<string, unknown>): unknown {
    return props.children;
}

export function $render(value: unknown): string {
    const template = document.createElement("template");

    function isClientJsxNode(child: unknown): child is ClientJsxNode {
        return (
            typeof child === "object" &&
            child !== null &&
            "tag" in child &&
            "props" in child
        );
    }

    function append(parent: DocumentFragment | Element, child: unknown) {
        if (child === null || child === undefined || typeof child === "boolean")
            return;
        if (Array.isArray(child)) {
            for (const item of child) append(parent, item);
            return;
        }
        if (!isClientJsxNode(child)) {
            parent.appendChild(document.createTextNode(String(child)));
            return;
        }

        if (typeof child.tag === "function") {
            append(parent, child.tag(child.props));
            return;
        }

        const element = document.createElement(child.tag);
        const dangerousHtml = child.props.dangerouslySetInnerHTML;
        for (const [rawName, propValue] of Object.entries(child.props)) {
            if (
                rawName === "children" ||
                rawName === "key" ||
                rawName === "ref" ||
                rawName === "dangerouslySetInnerHTML" ||
                propValue === null ||
                propValue === undefined ||
                propValue === false ||
                (rawName.startsWith("on") && typeof propValue === "function")
            )
                continue;
            if (rawName === "style" && typeof propValue === "object") {
                Object.assign(element.style, propValue);
                continue;
            }
            const name =
                rawName === "className"
                    ? "class"
                    : rawName === "htmlFor"
                      ? "for"
                      : rawName;
            element.setAttribute(
                name,
                propValue === true ? "" : String(propValue),
            );
        }
        if (
            typeof dangerousHtml === "object" &&
            dangerousHtml !== null &&
            "__html" in dangerousHtml
        ) {
            element.innerHTML = String(dangerousHtml.__html);
        } else {
            append(element, child.props.children);
        }
        parent.appendChild(element);
    }

    append(template.content, value);
    return template.innerHTML;
}

export const clientJsxDependencies = [
    { fn: jsxDEV, name: "jsxDEV" },
    { fn: jsx, name: "jsx" },
    { fn: jsxs, name: "jsxs" },
    { fn: Fragment, name: "Fragment" },
];
