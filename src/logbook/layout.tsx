import { useAppContext } from "../app";
import * as routes from "../routes";

export function LogbookPage(props: { title: string; children: any }) {
    const user = useAppContext().getUser();

    return (
        <main className="mx-auto max-w-3xl space-y-6 py-4">
            <header className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <a
                        href={routes.logbook({})}
                        className="text-sm text-blue-700 hover:underline"
                    >
                        {user.getDisplayName()}'s logbook
                    </a>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                        {props.title}
                    </h1>
                </div>
                <form method="post" action={routes.logout({})}>
                    <button
                        type="submit"
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Log out
                    </button>
                </form>
            </header>
            {props.children}
        </main>
    );
}
