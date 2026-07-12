import { ErrorList } from "./feedback";

export function AuthFormShell(props: {
    title: string;
    errors: string[];
    submitLabel: string;
    alternateHref: string;
    alternateLabel: string;
    children: any;
}) {
    return (
        <div className="mx-auto mt-8 max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-900/5 sm:mt-16 sm:p-8 dark:bg-slate-900 dark:ring-slate-100/10">
            <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {props.title}
            </h2>
            <ErrorList
                errors={props.errors}
                className="mb-5 space-y-1 rounded-lg bg-red-50 p-3 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50"
            />
            <form method="post" className="space-y-4">
                {props.children}
                <button
                    type="submit"
                    className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:py-2.5 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400/40"
                >
                    {props.submitLabel}
                </button>
                <div className="pt-2 text-center text-sm text-slate-600 dark:text-slate-400">
                    <a
                        href={props.alternateHref}
                        className="font-medium text-indigo-600 underline-offset-2 hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        {props.alternateLabel}
                    </a>
                </div>
            </form>
        </div>
    );
}
