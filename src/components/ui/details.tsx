import clsx from "clsx";

export function Details(props: {
    summary: any;
    open?: boolean;
    className?: string;
    summaryClassName?: string;
    children: any;
}) {
    return (
        <details open={props.open} className={clsx("group", props.className)}>
            <summary
                className={clsx(
                    "flex cursor-pointer list-none items-center gap-2 marker:hidden",
                    props.summaryClassName,
                )}
            >
                <svg
                    aria-hidden="true"
                    className="h-4 w-4 flex-none text-slate-400 transition-transform group-open:rotate-90 dark:text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9 5l7 7-7 7"
                    />
                </svg>
                {props.summary}
            </summary>
            {props.children}
        </details>
    );
}
