import { and, desc, eq, inArray } from "drizzle-orm";
import { app, getAppContext, type AppRequestContext } from "./app";
import * as routes from "./routes";
import {
    aircrafts,
    gear,
    jumps,
    jumpsToGear,
    jumpTypes,
    jumpsToJumpTypes,
    locations,
} from "./schema";
import { LogbookPage } from "./logbook/layout";
import "./logbook/aircraft";
import "./logbook/gear";
import "./logbook/jump";
import "./logbook/jump-type";
import "./logbook/location";
import "./logbook/transfer";
function jumpFreefallDistance(jump: {
    exitAltitude: number;
    openingAltitude: number;
}): number {
    return Math.max(0, jump.exitAltitude - jump.openingAltitude);
}

function jumpAvgSpeed(jump: {
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
}): number | null {
    if (jump.freefallTime <= 0) {
        return null;
    }
    return jumpFreefallDistance(jump) / jump.freefallTime;
}

function formatSpeed(metersPerSecond: number): string {
    const kmh = Math.round(metersPerSecond * 3.6);
    return `${kmh} km/h`;
}

function formatDistance(meters: number): string {
    const kilometers = meters / 1000;
    const formatted = kilometers.toFixed(1).replace(/\.0$/, "");
    return `${formatted} km`;
}

function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) {
        return `${seconds} s`;
    }
    if (seconds === 0) {
        return `${minutes} min`;
    }
    return `${minutes} min ${seconds} s`;
}

function LogbookStats(props: {
    totalJumps: number;
    totalFreefallMeters: number;
}) {
    return (
        <section
            aria-label="Logbook summary"
            className="grid grid-cols-2 gap-4"
        >
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2">
                    <span
                        aria-hidden="true"
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M3 17l6-6 4 4 8-8M21 7h-4m4 0v4"
                            />
                        </svg>
                    </span>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Total jumps
                    </p>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                    {props.totalJumps}
                </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2">
                    <span
                        aria-hidden="true"
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </span>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Total freefall
                    </p>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                    {formatDistance(props.totalFreefallMeters)}
                </p>
            </div>
        </section>
    );
}

function JumpStat(props: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {props.label}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-700">
                {props.value}
            </dd>
        </div>
    );
}

function JumpCard(props: {
    uuid: string;
    jumpNumber: number;
    locationName: string;
    aircraftName: string;
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
    description: string | null;
    jumpTypes: string[];
}) {
    const avgSpeed = jumpAvgSpeed(props);

    return (
        <li>
            <a
                href={routes.jumpEdit({ uuid: props.uuid })}
                className="block rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-indigo-300 hover:bg-slate-50/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex items-center gap-3">
                        <span className="flex min-w-9 items-center justify-center rounded-xl bg-indigo-100 px-2 py-1.5 text-sm font-bold text-indigo-700 tabular-nums">
                            #{props.jumpNumber}
                        </span>
                        <span className="text-base font-semibold text-slate-900">
                            {props.locationName} / {props.aircraftName}
                        </span>
                    </div>
                    {props.jumpTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {props.jumpTypes.map((name) => (
                                <span
                                    key={name}
                                    className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200/60"
                                >
                                    {name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <JumpStat label="Exit" value={`${props.exitAltitude} m`} />
                    <JumpStat
                        label="Opening"
                        value={`${props.openingAltitude} m`}
                    />
                    <JumpStat
                        label="Freefall"
                        value={formatDuration(props.freefallTime)}
                    />
                    <JumpStat
                        label="Avg speed"
                        value={avgSpeed === null ? "—" : formatSpeed(avgSpeed)}
                    />
                </dl>
                {props.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                        {props.description}
                    </p>
                )}
            </a>
        </li>
    );
}

interface LogbookResource {
    uuid: string;
    name: string;
}

interface LogbookFilters {
    locationUuids: string[];
    gearUuids: string[];
    jumpTypeUuids: string[];
}

function filterResourceUuids(
    query: URLSearchParams,
    name: string,
    resources: LogbookResource[],
): string[] {
    const resourceUuids = new Set(resources.map((resource) => resource.uuid));
    return [...new Set(query.getAll(name))].filter((uuid) =>
        resourceUuids.has(uuid),
    );
}

function JumpFilters(props: {
    filters: LogbookFilters;
    locations: LogbookResource[];
    gear: LogbookResource[];
    jumpTypes: LogbookResource[];
}) {
    const selectedLocations = new Set(props.filters.locationUuids);
    const selectedGear = new Set(props.filters.gearUuids);
    const selectedJumpTypes = new Set(props.filters.jumpTypeUuids);
    const hasFilters =
        selectedLocations.size > 0 ||
        selectedGear.size > 0 ||
        selectedJumpTypes.size > 0;

    return (
        <details
            open={hasFilters}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
            <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-900 marker:hidden">
                <svg
                    aria-hidden="true"
                    className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90"
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
                Filter jumps
                {hasFilters && (
                    <a
                        href={routes.logbook({})}
                        className="ml-auto text-sm font-normal text-indigo-600 hover:underline"
                    >
                        Clear filters
                    </a>
                )}
            </summary>
            <form
                action={routes.logbook({})}
                method="get"
                className="mt-5 space-y-5"
            >
                <fieldset>
                    <legend className="text-sm font-semibold text-slate-700">
                        Locations
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.locations.map((location) => (
                            <label
                                key={location.uuid}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900"
                            >
                                <input
                                    name="locationUuids"
                                    type="checkbox"
                                    value={location.uuid}
                                    checked={selectedLocations.has(
                                        location.uuid,
                                    )}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40"
                                />
                                {location.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-sm font-semibold text-slate-700">
                        Gear
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.gear.map((item) => (
                            <label
                                key={item.uuid}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900"
                            >
                                <input
                                    name="gearUuids"
                                    type="checkbox"
                                    value={item.uuid}
                                    checked={selectedGear.has(item.uuid)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40"
                                />
                                {item.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-sm font-semibold text-slate-700">
                        Jump types
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.jumpTypes.map((item) => (
                            <label
                                key={item.uuid}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900"
                            >
                                <input
                                    name="jumpTypeUuids"
                                    type="checkbox"
                                    value={item.uuid}
                                    checked={selectedJumpTypes.has(item.uuid)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40"
                                />
                                {item.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div className="flex flex-wrap gap-3 pt-2">
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                        Apply filters
                    </button>
                </div>
            </form>
        </details>
    );
}

async function getLogbookFilterResources(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const [locationRows, gearItems, jumpTypeRows] = await Promise.all([
        db
            .select({ uuid: locations.uuid, name: locations.name })
            .from(locations)
            .where(
                and(
                    eq(locations.userUuid, userUuid),
                    eq(locations.archived, false),
                ),
            )
            .orderBy(locations.name),
        db
            .select({ uuid: gear.uuid, name: gear.name })
            .from(gear)
            .where(and(eq(gear.userUuid, userUuid), eq(gear.archived, false)))
            .orderBy(gear.name),
        db
            .select({ uuid: jumpTypes.uuid, name: jumpTypes.name })
            .from(jumpTypes)
            .where(
                and(
                    eq(jumpTypes.userUuid, userUuid),
                    eq(jumpTypes.archived, false),
                ),
            )
            .orderBy(jumpTypes.name),
    ]);

    return {
        locations: locationRows,
        gear: gearItems,
        jumpTypes: jumpTypeRows,
    };
}

function getLogbookFilters(
    c: AppRequestContext,
    resources: Awaited<ReturnType<typeof getLogbookFilterResources>>,
): LogbookFilters {
    const query = new URL(c.req.url).searchParams;
    return {
        locationUuids: filterResourceUuids(
            query,
            "locationUuids",
            resources.locations,
        ),
        gearUuids: filterResourceUuids(query, "gearUuids", resources.gear),
        jumpTypeUuids: filterResourceUuids(
            query,
            "jumpTypeUuids",
            resources.jumpTypes,
        ),
    };
}

async function getLogbookJumps(c: AppRequestContext, filters: LogbookFilters) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const conditions = [
        eq(jumps.userUuid, userUuid),
        ...(filters.locationUuids.length > 0
            ? [inArray(jumps.locationUuid, filters.locationUuids)]
            : []),
        ...(filters.gearUuids.length > 0
            ? [
                  inArray(
                      jumps.uuid,
                      db
                          .select({ jumpUuid: jumpsToGear.jumpUuid })
                          .from(jumpsToGear)
                          .where(
                              inArray(jumpsToGear.gearUuid, filters.gearUuids),
                          ),
                  ),
              ]
            : []),
        ...(filters.jumpTypeUuids.length > 0
            ? [
                  inArray(
                      jumps.uuid,
                      db
                          .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
                          .from(jumpsToJumpTypes)
                          .where(
                              inArray(
                                  jumpsToJumpTypes.jumpTypeUuid,
                                  filters.jumpTypeUuids,
                              ),
                          ),
                  ),
              ]
            : []),
    ];
    return db
        .select({
            uuid: jumps.uuid,
            jumpNumber: jumps.jumpNumber,
            exitAltitude: jumps.exitAltitude,
            openingAltitude: jumps.openingAltitude,
            freefallTime: jumps.freefallTime,
            description: jumps.description,
            locationName: locations.name,
            aircraftName: aircrafts.name,
        })
        .from(jumps)
        .innerJoin(locations, eq(jumps.locationUuid, locations.uuid))
        .innerJoin(aircrafts, eq(jumps.aircraftUuid, aircrafts.uuid))
        .where(and(...conditions))
        .orderBy(desc(jumps.jumpNumber));
}

async function getJumpTypesByJump(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const rows = await db
        .select({
            jumpUuid: jumpsToJumpTypes.jumpUuid,
            name: jumpTypes.name,
        })
        .from(jumpsToJumpTypes)
        .innerJoin(jumpTypes, eq(jumpsToJumpTypes.jumpTypeUuid, jumpTypes.uuid))
        .innerJoin(jumps, eq(jumpsToJumpTypes.jumpUuid, jumps.uuid))
        .where(and(eq(jumps.userUuid, userUuid), eq(jumpTypes.archived, false)))
        .orderBy(jumpTypes.name);

    const jumpTypesByJump = new Map<string, string[]>();
    for (const row of rows) {
        const list = jumpTypesByJump.get(row.jumpUuid) ?? [];
        list.push(row.name);
        jumpTypesByJump.set(row.jumpUuid, list);
    }
    return jumpTypesByJump;
}

function getTotalFreefallMeters(
    jumpRows: {
        exitAltitude: number;
        openingAltitude: number;
    }[],
): number {
    let totalFreefallMeters = 0;
    for (const jump of jumpRows) {
        totalFreefallMeters += jumpFreefallDistance(jump);
    }
    return totalFreefallMeters;
}

async function renderLogbook(c: AppRequestContext) {
    const resources = await getLogbookFilterResources(c);
    const filters = getLogbookFilters(c, resources);
    const [jumpRows, jumpTypesByJump] = await Promise.all([
        getLogbookJumps(c, filters),
        getJumpTypesByJump(c),
    ]);
    const totalFreefallMeters = getTotalFreefallMeters(jumpRows);

    return c.render(
        <LogbookPage title="Jump Logbook">
            {jumpRows.length > 0 && (
                <LogbookStats
                    totalJumps={jumpRows.length}
                    totalFreefallMeters={totalFreefallMeters}
                />
            )}
            <JumpFilters
                filters={filters}
                locations={resources.locations}
                gear={resources.gear}
                jumpTypes={resources.jumpTypes}
            />
            <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Jumps
                    </h2>
                    {jumpRows.length > 0 && (
                        <span className="text-sm text-slate-400">
                            {jumpRows.length} total
                        </span>
                    )}
                </div>
                {jumpRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                        <p className="text-sm text-slate-500">
                            {filters.locationUuids.length > 0 ||
                            filters.gearUuids.length > 0 ||
                            filters.jumpTypeUuids.length > 0
                                ? "No jumps match the selected filters."
                                : "No jumps yet. Add your first jump to start your logbook."}
                        </p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {jumpRows.map((jump) => (
                            <JumpCard
                                uuid={jump.uuid}
                                jumpNumber={jump.jumpNumber}
                                locationName={jump.locationName}
                                aircraftName={jump.aircraftName}
                                exitAltitude={jump.exitAltitude}
                                openingAltitude={jump.openingAltitude}
                                freefallTime={jump.freefallTime}
                                description={jump.description}
                                jumpTypes={jumpTypesByJump.get(jump.uuid) ?? []}
                            />
                        ))}
                    </ul>
                )}
            </section>
        </LogbookPage>,
    );
}

app.get(routes.logbook.route, renderLogbook);
