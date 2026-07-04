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
        <div className="mx-auto mt-4 max-w-md rounded-lg bg-white p-4 shadow-md sm:mt-10 sm:p-6">
            <h2 className="mb-4 text-center text-xl font-bold sm:text-2xl">
                {props.title}
            </h2>
            <ErrorList
                errors={props.errors}
                className="mb-4 space-y-1 border-red-400 bg-red-100 text-red-700"
            />
            <form method="post" className="space-y-4">
                {props.children}
                <button
                    type="submit"
                    className="w-full rounded-md bg-blue-500 px-4 py-3 text-base font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:py-2"
                >
                    {props.submitLabel}
                </button>
                <div className="mt-4 text-center">
                    <a
                        href={props.alternateHref}
                        className="text-sm text-gray-600 underline hover:text-gray-800"
                    >
                        {props.alternateLabel}
                    </a>
                </div>
            </form>
        </div>
    );
}
