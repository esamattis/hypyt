import { useAppContext } from "@/app/app";
import { $render, clientJsxDependencies } from "@/components/script/client-jsx";

export { $render };

type ClientFunction = ((...args: any[]) => any) & { displayName?: string };
const nameCache = new WeakMap<ClientFunction, string>();

function getGlobalName(fn: ClientFunction): string {
    const cachedName = nameCache.get(fn);
    if (cachedName) return cachedName;
    let hash = 5381;
    const input = fn.toString();
    for (let i = 0; i < input.length; i++)
        hash = ((hash << 5) + hash + input.charCodeAt(i)) & hash;
    const name = fn.displayName || fn.name;
    const globalName = name
        ? `__${name}_${Math.abs(hash).toString(16)}`
        : `__${Math.abs(hash).toString(16)}`;
    nameCache.set(fn, globalName);
    return globalName;
}

export function Script<T extends readonly unknown[] = []>(props: {
    $exec: ((...args: T) => void) & { displayName?: string };
    $deps?: ClientFunction[];
    $args?: T;
}) {
    const jsDupCache = useAppContext().jsDupCache;
    const dependencies = (props.$deps ?? []).map((fn) => ({
        fn,
        name: fn.name,
    }));
    if (props.$deps?.includes($render))
        dependencies.push(...clientJsxDependencies);
    let depsCode = "";
    for (const dependency of dependencies) {
        if (!dependency.name)
            throw new Error(
                "All client dependencies must have a function name: " +
                    dependency.fn.toString(),
            );
        if (!jsDupCache.has(dependency.fn)) {
            jsDupCache.add(dependency.fn);
            depsCode += `${getGlobalName(dependency.fn)} = ${dependency.fn.toString()};\n`;
        }
    }
    if (!jsDupCache.has(props.$exec)) {
        jsDupCache.add(props.$exec);
        let execSource = props.$exec.toString();
        for (const dependency of dependencies) {
            const globalName = getGlobalName(dependency.fn);
            const escapedDepName = dependency.name.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&",
            );
            depsCode += `const ${dependency.name} = ${globalName};\n`;
            execSource = execSource.replace(
                new RegExp(`\\(0,[\\w$]+\\.${escapedDepName}\\)`, "g"),
                dependency.name,
            );
            if (
                clientJsxDependencies.some(
                    (clientDependency) =>
                        clientDependency.name === dependency.name,
                )
            ) {
                execSource = execSource.replace(
                    new RegExp(`\\b${escapedDepName}\\$\\d+\\b`, "g"),
                    dependency.name,
                );
            }
        }
        depsCode += `${getGlobalName(props.$exec)} = ${execSource};\n`;
    }
    if (depsCode !== "")
        depsCode = `\n(() => { const __name = (a) => a; ${depsCode} })();\n`;
    const args =
        props.$args?.map((arg) => JSON.stringify(arg)).join(", ") ?? "";
    return (
        <script
            dangerouslySetInnerHTML={{
                __html: `\n${depsCode}\n${getGlobalName(props.$exec)}(${args});\n`,
            }}
        />
    );
}
