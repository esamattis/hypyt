import { and, asc, eq, sql } from "drizzle-orm";
import { app, getAppContext, type AppRequestContext } from "../app";
import * as routes from "../routes";
import {
    aircrafts,
    gear,
    jumps,
    jumpsToGear,
    jumpsToJumpTypes,
    jumpTypes,
    locations,
} from "../schema";
import { LogbookPage } from "./layout";

interface StatisticsItem {
    uuid: string;
    name: string;
    archived: boolean;
    previousJumpCount: number;
    recordedJumpCount: number;
    href: string;
}

function getTotalJumpCount(item: StatisticsItem): number {
    return item.previousJumpCount + item.recordedJumpCount;
}

function compareStatisticsItems(
    first: StatisticsItem,
    second: StatisticsItem,
): number {
    const countDifference =
        getTotalJumpCount(second) - getTotalJumpCount(first);
    return countDifference || first.name.localeCompare(second.name);
}

function StatisticsSection(props: { title: string; items: StatisticsItem[] }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                    {props.title}
                </h2>
                <span className="text-sm text-slate-400">
                    {props.items.length} items
                </span>
            </div>
            {props.items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                    No {props.title.toLowerCase()} yet.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                            <tr>
                                <th scope="col" className="px-5 py-3">
                                    Item
                                </th>
                                <th
                                    scope="col"
                                    className="px-5 py-3 text-right"
                                >
                                    Recorded
                                </th>
                                <th
                                    scope="col"
                                    className="px-5 py-3 text-right"
                                >
                                    Previous
                                </th>
                                <th
                                    scope="col"
                                    className="px-5 py-3 text-right"
                                >
                                    Total jumps
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {props.items.map((item) => (
                                <tr key={item.uuid}>
                                    <td className="px-5 py-3.5 font-medium text-slate-900">
                                        <a
                                            href={item.href}
                                            className="transition hover:text-indigo-600 hover:underline"
                                        >
                                            {item.name}
                                        </a>
                                        {item.archived && (
                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                                                Archived
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">
                                        {item.recordedJumpCount.toLocaleString(
                                            "en-US",
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">
                                        {item.previousJumpCount.toLocaleString(
                                            "en-US",
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-900">
                                        {getTotalJumpCount(item).toLocaleString(
                                            "en-US",
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function toStatisticsItems(
    rows: Array<{
        uuid: string;
        name: string;
        archived: boolean;
        previousJumpCount: number;
        recordedJumpCount: number;
    }>,
    getHref: (uuid: string) => string,
): StatisticsItem[] {
    return rows
        .map((row) => ({ ...row, href: getHref(row.uuid) }))
        .sort(compareStatisticsItems);
}

async function renderDetailedStatistics(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const [locationRows, aircraftRows, gearRows, jumpTypeRows] =
        await Promise.all([
            db
                .select({
                    uuid: locations.uuid,
                    name: locations.name,
                    archived: locations.archived,
                    previousJumpCount: locations.previousJumpCount,
                    recordedJumpCount: sql<number>`count(${jumps.uuid})`,
                })
                .from(locations)
                .leftJoin(
                    jumps,
                    and(
                        eq(locations.uuid, jumps.locationUuid),
                        eq(jumps.userUuid, userUuid),
                    ),
                )
                .where(eq(locations.userUuid, userUuid))
                .groupBy(locations.uuid)
                .orderBy(asc(locations.name)),
            db
                .select({
                    uuid: aircrafts.uuid,
                    name: aircrafts.name,
                    archived: aircrafts.archived,
                    previousJumpCount: aircrafts.previousJumpCount,
                    recordedJumpCount: sql<number>`count(${jumps.uuid})`,
                })
                .from(aircrafts)
                .leftJoin(
                    jumps,
                    and(
                        eq(aircrafts.uuid, jumps.aircraftUuid),
                        eq(jumps.userUuid, userUuid),
                    ),
                )
                .where(eq(aircrafts.userUuid, userUuid))
                .groupBy(aircrafts.uuid)
                .orderBy(asc(aircrafts.name)),
            db
                .select({
                    uuid: gear.uuid,
                    name: gear.name,
                    archived: gear.archived,
                    previousJumpCount: gear.previousUsageCount,
                    recordedJumpCount: sql<number>`count(${jumps.uuid})`,
                })
                .from(gear)
                .leftJoin(jumpsToGear, eq(gear.uuid, jumpsToGear.gearUuid))
                .leftJoin(
                    jumps,
                    and(
                        eq(jumpsToGear.jumpUuid, jumps.uuid),
                        eq(jumps.userUuid, userUuid),
                    ),
                )
                .where(eq(gear.userUuid, userUuid))
                .groupBy(gear.uuid)
                .orderBy(asc(gear.name)),
            db
                .select({
                    uuid: jumpTypes.uuid,
                    name: jumpTypes.name,
                    archived: jumpTypes.archived,
                    previousJumpCount: jumpTypes.previousUsageCount,
                    recordedJumpCount: sql<number>`count(${jumps.uuid})`,
                })
                .from(jumpTypes)
                .leftJoin(
                    jumpsToJumpTypes,
                    eq(jumpTypes.uuid, jumpsToJumpTypes.jumpTypeUuid),
                )
                .leftJoin(
                    jumps,
                    and(
                        eq(jumpsToJumpTypes.jumpUuid, jumps.uuid),
                        eq(jumps.userUuid, userUuid),
                    ),
                )
                .where(eq(jumpTypes.userUuid, userUuid))
                .groupBy(jumpTypes.uuid)
                .orderBy(asc(jumpTypes.name)),
        ]);

    const locationsWithCounts = toStatisticsItems(locationRows, (uuid) =>
        routes.locationEdit({ uuid }),
    );
    const aircraftWithCounts = toStatisticsItems(aircraftRows, (uuid) =>
        routes.aircraftEdit({ uuid }),
    );
    const gearWithCounts = toStatisticsItems(gearRows, (uuid) =>
        routes.gearEdit({ uuid }),
    );
    const jumpTypesWithCounts = toStatisticsItems(jumpTypeRows, (uuid) =>
        routes.jumpTypeEdit({ uuid }),
    );

    return c.render(
        <LogbookPage title="Detailed statistics">
            <p className="text-sm text-slate-500">
                Recorded jumps are combined with each item&apos;s previous
                count.
            </p>
            <div className="space-y-6">
                <StatisticsSection
                    title="Locations"
                    items={locationsWithCounts}
                />
                <StatisticsSection
                    title="Aircraft"
                    items={aircraftWithCounts}
                />
                <StatisticsSection title="Gear" items={gearWithCounts} />
                <StatisticsSection
                    title="Jump types"
                    items={jumpTypesWithCounts}
                />
            </div>
        </LogbookPage>,
    );
}

app.get(routes.logbookDetailedStatistics.route, renderDetailedStatistics);
