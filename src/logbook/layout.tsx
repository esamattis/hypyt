import { useAppContext } from "../app";
import { Script, Style } from "../components/helpers";
import * as routes from "../routes";
import { $assertElement } from "../utils";
import { useId } from "hono/jsx";

function ChevronDownIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-slate-400 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19 9l-7 7-7-7"
            />
        </svg>
    );
}

function ManageLogbookMenu() {
    const id = useId();
    const menuId = `logbook-management-menu-${id}`;
    const buttonId = `logbook-management-button-${id}`;

    return (
        <div className="relative">
            <button
                id={buttonId}
                type="button"
                aria-controls={menuId}
                aria-expanded="false"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
                Manage logbook
                <ChevronDownIcon />
            </button>
            <div
                id={menuId}
                hidden
                className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"
            >
                <a
                    href={routes.aircraftList({})}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                    Manage aircraft
                </a>
                <a
                    href={routes.gearList({})}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                    Manage gear
                </a>
                <a
                    href={routes.jumpTypeList({})}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                    Manage jump types
                </a>
                <a
                    href={routes.locationList({})}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                    Manage locations
                </a>
                <div className="my-1 h-px bg-slate-100"></div>
                <a
                    href={routes.logbookTransfer({})}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                    Import or export
                </a>
            </div>
            <Script
                $deps={[$assertElement]}
                $args={[buttonId, menuId]}
                $exec={(buttonId, menuId) => {
                    const button = document.getElementById(buttonId);
                    $assertElement(button, HTMLButtonElement);
                    const menu = document.getElementById(menuId);
                    $assertElement(menu, HTMLDivElement);
                    if (
                        !(button instanceof HTMLButtonElement) ||
                        !(menu instanceof HTMLDivElement)
                    ) {
                        return;
                    }
                    const chevron = button.querySelector("svg");

                    function setMenuOpen(
                        menuElement: HTMLDivElement,
                        buttonElement: HTMLButtonElement,
                        isOpen: boolean,
                    ) {
                        menuElement.hidden = !isOpen;
                        buttonElement.setAttribute(
                            "aria-expanded",
                            String(isOpen),
                        );
                        if (chevron) {
                            chevron.style.transform = isOpen
                                ? "rotate(180deg)"
                                : "";
                        }
                    }

                    button.addEventListener("click", (event) => {
                        event.stopPropagation();
                        setMenuOpen(menu, button, Boolean(menu.hidden));
                    });

                    document.addEventListener("click", (event) => {
                        if (
                            !menu.hidden &&
                            event.target instanceof Node &&
                            !menu.contains(event.target) &&
                            !button.contains(event.target)
                        ) {
                            setMenuOpen(menu, button, false);
                        }
                    });

                    document.addEventListener("keydown", (event) => {
                        if (event.key === "Escape" && !menu.hidden) {
                            setMenuOpen(menu, button, false);
                            button.focus();
                        }
                    });
                }}
            />
        </div>
    );
}

function LogbookActions() {
    return (
        <nav className="flex flex-wrap items-center gap-2">
            <a
                href={routes.jumpNew({}, {})}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
                <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 4v16m8-8H4"
                    />
                </svg>
                Add jump
            </a>
            <ManageLogbookMenu />
        </nav>
    );
}

export function LogbookPage(props: { title: string; children: any }) {
    const user = useAppContext().getUser();

    return (
        <div className="min-h-screen">
            <Style>
                {`
                    html { scroll-padding-top: 4rem; }
                    summary { list-style: none; }
                    summary::-webkit-details-marker { display: none; }
                `}
            </Style>
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md">
                <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5 sm:py-3">
                    <a
                        href={routes.logbook({})}
                        className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-900 sm:text-lg"
                    >
                        <span
                            aria-hidden="true"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm text-white shadow-sm"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2.2"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M12 19V5M5 12l7-7 7 7"
                                />
                            </svg>
                        </span>
                        <span className="hidden sm:inline">Jump Logbook</span>
                    </a>
                    <span className="hidden text-slate-300 sm:inline">·</span>
                    <a
                        href={routes.logbook({})}
                        className="truncate text-sm text-slate-500 transition hover:text-indigo-600 hover:underline"
                    >
                        {user.getDisplayName()}'s logbook
                    </a>
                    <div className="ml-auto flex items-center gap-2">
                        <LogbookActions />
                        <form method="post" action={routes.logout({})}>
                            <button
                                type="submit"
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                title="Log out"
                            >
                                <svg
                                    aria-hidden="true"
                                    className="h-4 w-4 sm:hidden"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
                                    />
                                </svg>
                                <span className="hidden sm:inline">
                                    Log out
                                </span>
                            </button>
                        </form>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {props.title}
                </h1>
                {props.children}
            </main>
        </div>
    );
}
