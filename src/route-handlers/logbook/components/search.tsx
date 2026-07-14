import clsx from "clsx";
import { controlClassName } from "@/components/form";
import { CloseIcon, SearchIcon } from "@/components/icons";
import * as routes from "@/routes";
import type { LogbookFilters } from "@/route-handlers/logbook/index";

export function buildLogbookUrl(
    filters: LogbookFilters,
    overrides: { search?: string } = {},
): string {
    const query = new URLSearchParams();
    for (const uuid of filters.locationUuids) {
        query.append("locationUuids", uuid);
    }
    for (const uuid of filters.gearUuids) {
        query.append("gearUuids", uuid);
    }
    for (const uuid of filters.jumpTypeUuids) {
        query.append("jumpTypeUuids", uuid);
    }
    const search = overrides.search ?? filters.search;
    if (search) {
        query.set("search", search);
    }
    const queryString = query.toString();
    return `${routes.logbook.index({})}${queryString ? `?${queryString}` : ""}`;
}

export function JumpSearch(props: { filters: LogbookFilters }) {
    const hasSearch = props.filters.search !== "";
    return (
        <form
            action={routes.logbook.index({})}
            method="get"
            role="search"
            className="relative flex items-center"
        >
            {props.filters.locationUuids.map((uuid) => (
                <input
                    key={`loc-${uuid}`}
                    type="hidden"
                    name="locationUuids"
                    value={uuid}
                />
            ))}
            {props.filters.gearUuids.map((uuid) => (
                <input
                    key={`gear-${uuid}`}
                    type="hidden"
                    name="gearUuids"
                    value={uuid}
                />
            ))}
            {props.filters.jumpTypeUuids.map((uuid) => (
                <input
                    key={`jt-${uuid}`}
                    type="hidden"
                    name="jumpTypeUuids"
                    value={uuid}
                />
            ))}
            <SearchIcon className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
                type="search"
                name="search"
                value={props.filters.search}
                placeholder="Search jumps..."
                aria-label="Search jumps"
                maxLength={200}
                className={clsx(
                    controlClassName,
                    "py-2 pl-9 pr-9 text-sm focus:ring-indigo-500/40",
                )}
            />
            {hasSearch && (
                <a
                    href={buildLogbookUrl(props.filters, { search: "" })}
                    aria-label="Clear search"
                    className="absolute right-2.5 inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                    <CloseIcon className="h-4 w-4" />
                </a>
            )}
        </form>
    );
}
