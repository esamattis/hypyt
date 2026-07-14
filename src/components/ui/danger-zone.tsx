import clsx from "clsx";

export function DangerZone(props: {
    children: any;
    label?: string;
    className?: string;
}) {
    return (
        <div
            className={clsx(
                "mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/20",
                props.className,
            )}
        >
            <p className="mb-3 text-sm font-medium text-red-700 dark:text-red-300">
                {props.label ?? "Danger zone"}
            </p>
            {props.children}
        </div>
    );
}
