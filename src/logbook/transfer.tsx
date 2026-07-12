import { eq } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod/v4";
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
import { TransferPage } from "./transfer-page";

const NamedResourceSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    previousCount: z.coerce
        .number()
        .int("Previous count must be a whole number")
        .min(0, "Previous count cannot be negative"),
    description: z.string().trim().max(2_000).nullable().optional(),
});

const ImportRecordSchema = z.discriminatedUnion("type", [
    NamedResourceSchema.extend({ type: z.literal("aircraft") }),
    NamedResourceSchema.extend({ type: z.literal("gear") }),
    NamedResourceSchema.extend({ type: z.literal("jumpType") }),
    NamedResourceSchema.extend({ type: z.literal("location") }),
    z.object({
        type: z.literal("jump"),
        jumpNumber: z.coerce
            .number()
            .int("Jump number must be a whole number")
            .positive("Jump number must be positive"),
        exitAltitude: z.coerce
            .number()
            .int("Exit altitude must be a whole number")
            .positive("Exit altitude must be positive"),
        openingAltitude: z.coerce
            .number()
            .int("Opening altitude must be a whole number")
            .min(0, "Opening altitude cannot be negative"),
        freefallTime: z.coerce
            .number()
            .int("Freefall time must be a whole number")
            .min(0, "Freefall time cannot be negative"),
        location: z.string().trim().min(1, "Location is required"),
        aircraft: z.string().trim().min(1, "Aircraft is required"),
        gear: z.array(z.string().trim().min(1)).default([]),
        jumpTypes: z.array(z.string().trim().min(1)).default([]),
        description: z.string().trim().max(2_000).nullable().optional(),
    }),
]);

/** A validated resource or jump record from a JSON Lines import. */
type ImportRecord = z.infer<typeof ImportRecordSchema>;

/** A persisted resource identified by UUID and display name. */
interface NamedResource {
    uuid: string;
    name: string;
}

/** The import record types that represent named resources. */
type ResourceType = Exclude<ImportRecord["type"], "jump">;

/** The application's Drizzle database client. */
type ImportDatabase = ReturnType<typeof getAppContext>["db"];

/** A queued database operation that can be executed. */
type ImportQuery = {
    description: string;
    run(): Promise<unknown>;
};

/** Mutable state accumulated while preparing an import. */
interface ImportState {
    db: ImportDatabase;
    userUuid: string;
    resources: Record<ResourceType, Map<string, string>>;
    jumpUuids: Map<number, string>;
    queries: ImportQuery[];
}

/** Normalizes a resource name for case-insensitive matching. */
function normalizeName(name: string): string {
    return name.trim().toLocaleLowerCase();
}

/** Maps normalized resource names to their UUIDs. */
function resourceMap(rows: NamedResource[]): Map<string, string> {
    return new Map(rows.map((row) => [normalizeName(row.name), row.uuid]));
}

interface XmlCatalog {
    records: Exclude<ImportRecord, { type: "jump" }>[];
    namesById: Map<string, string>;
}

function xmlObject(value: unknown, label: string): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`${label} is missing or invalid`);
    }
    return Object.fromEntries(Object.entries(value));
}

function xmlItems(value: unknown): unknown[] {
    return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function xmlString(record: Record<string, unknown>, field: string) {
    const value = record[field];
    return typeof value === "string" ? value.trim() || undefined : undefined;
}

function requiredXmlString(record: Record<string, unknown>, field: string) {
    const value = xmlString(record, field);
    if (!value) {
        throw new Error(`Missing ${field}`);
    }
    return value;
}

function xmlNumber(
    record: Record<string, unknown>,
    field: string,
    minimum: number,
) {
    const value = Number(xmlString(record, field));
    if (!Number.isInteger(value) || value < minimum) {
        throw new Error(
            `${field} must be a whole number of at least ${minimum}`,
        );
    }
    return value;
}

function createXmlCatalog(
    value: unknown,
    itemName: string,
    type: ResourceType,
): XmlCatalog {
    const records: Exclude<ImportRecord, { type: "jump" }>[] = [];
    const namesById = new Map<string, string>();
    const names = new Set<string>();
    for (const item of xmlItems(xmlObject(value, itemName)[itemName])) {
        const record = xmlObject(item, itemName);
        const id = requiredXmlString(record, "id");
        const name = requiredXmlString(record, "name");
        namesById.set(id, name);
        if (!names.has(name)) {
            records.push({
                type,
                name,
                previousCount: xmlString(record, "previous_jump_count")
                    ? xmlNumber(record, "previous_jump_count", 0)
                    : 0,
            });
            names.add(name);
        }
    }
    return { records, namesById };
}

function resolveXmlNames(
    ids: string[],
    catalog: XmlCatalog,
    resourceName: string,
    errors: string[],
    jumpNumber: number,
): string[] {
    return ids.flatMap((id) => {
        const name = catalog.namesById.get(id);
        if (name) {
            return [name];
        }
        errors.push(
            `Jump #${jumpNumber}: unknown ${resourceName} ID ${JSON.stringify(id)}`,
        );
        return [];
    });
}

function xmlRigIds(record: Record<string, unknown>): string[] {
    if (record.rigs === undefined) {
        return [];
    }
    return xmlItems(xmlObject(record.rigs, "rigs").rig_id).flatMap((value) =>
        typeof value === "string" && value.trim() ? [value.trim()] : [],
    );
}

function parseSkydivingLogbookXml(xml: string): ImportRecord[] {
    const parser = new XMLParser({ parseTagValue: false, trimValues: false });
    const parsed = xmlObject(parser.parse(xml), "XML document");
    const logbook = xmlObject(parsed.skydiving_logbook, "skydiving_logbook");
    const locations = createXmlCatalog(
        logbook.locations,
        "location",
        "location",
    );
    const aircraft = createXmlCatalog(
        logbook.aircrafts,
        "aircraft",
        "aircraft",
    );
    const gearCatalog = createXmlCatalog(logbook.rigs, "rig", "gear");
    const jumpTypes = createXmlCatalog(
        logbook.skydive_types,
        "skydive_type",
        "jumpType",
    );
    const jumps: Extract<ImportRecord, { type: "jump" }>[] = [];
    const errors: string[] = [];
    let needsUnknownLocation = false;
    let needsUnknownAircraft = false;
    for (const item of xmlItems(
        xmlObject(logbook.log_entries, "log_entries").log_entry,
    )) {
        const record = xmlObject(item, "log_entry");
        const jumpNumber = xmlNumber(record, "jump_number", 1);
        const locationId = xmlString(record, "location_id");
        const aircraftId = xmlString(record, "aircraft_id");
        const location = locationId
            ? resolveXmlNames(
                  [locationId],
                  locations,
                  "location",
                  errors,
                  jumpNumber,
              )[0]
            : "Unknown location";
        const aircraftName = aircraftId
            ? resolveXmlNames(
                  [aircraftId],
                  aircraft,
                  "aircraft",
                  errors,
                  jumpNumber,
              )[0]
            : "Unknown aircraft";
        if (!location || !aircraftName) {
            continue;
        }
        needsUnknownLocation ||= !locationId;
        needsUnknownAircraft ||= !aircraftId;
        const description = xmlString(record, "notes");
        jumps.push({
            type: "jump",
            jumpNumber,
            exitAltitude: xmlNumber(record, "exit_altitude", 1),
            openingAltitude: xmlNumber(record, "deployment_altitude", 0),
            freefallTime: xmlNumber(record, "freefall_time", 0),
            location,
            aircraft: aircraftName,
            gear: resolveXmlNames(
                xmlRigIds(record),
                gearCatalog,
                "rig",
                errors,
                jumpNumber,
            ),
            jumpTypes: resolveXmlNames(
                xmlString(record, "skydive_type_id")
                    ? [requiredXmlString(record, "skydive_type_id")]
                    : [],
                jumpTypes,
                "skydive type",
                errors,
                jumpNumber,
            ),
            ...(description ? { description } : {}),
        });
    }
    if (errors.length > 0) {
        throw new Error(errors.join("\n"));
    }
    return [
        ...aircraft.records,
        ...(needsUnknownAircraft
            ? [
                  {
                      type: "aircraft" as const,
                      name: "Unknown aircraft",
                      previousCount: 0,
                  },
              ]
            : []),
        ...gearCatalog.records,
        ...jumpTypes.records,
        ...locations.records,
        ...(needsUnknownLocation
            ? [
                  {
                      type: "location" as const,
                      name: "Unknown location",
                      previousCount: 0,
                  },
              ]
            : []),
        ...jumps,
    ];
}

/** Reads and validates JSON Lines or Skydiving Logbook XML import records. */
async function readImportRecords(
    file: File,
): Promise<{ errors: string[] } | { records: ImportRecord[] }> {
    const content = await file.text();
    if (content.trimStart().startsWith("<")) {
        let values: unknown[];
        try {
            values = parseSkydivingLogbookXml(content);
        } catch (error) {
            return {
                errors: [
                    error instanceof Error
                        ? error.message
                        : "Invalid Skydiving Logbook XML",
                ],
            };
        }
        const records: ImportRecord[] = [];
        const errors: string[] = [];
        for (const [index, value] of values.entries()) {
            const result = ImportRecordSchema.safeParse(value);
            if (result.success) {
                records.push(result.data);
            } else {
                errors.push(
                    `XML record ${index + 1}: ${result.error.issues.map((issue) => issue.message).join(", ")}`,
                );
            }
        }
        return errors.length > 0 ? { errors } : { records };
    }

    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
        return { errors: ["The import file is empty"] };
    }

    const records: ImportRecord[] = [];
    const errors: string[] = [];
    for (const [index, line] of lines.entries()) {
        let value: unknown;
        try {
            value = JSON.parse(line);
        } catch {
            errors.push(`Line ${index + 1}: Invalid JSON`);
            continue;
        }
        const result = ImportRecordSchema.safeParse(value);
        if (result.success) {
            records.push(result.data);
        } else {
            errors.push(
                `Line ${index + 1}: ${result.error.issues.map((issue) => issue.message).join(", ")}`,
            );
        }
    }
    return errors.length > 0 ? { errors } : { records };
}

/** Loads existing user resources and initializes the import query queue. */
async function createImportState(
    db: ImportDatabase,
    userUuid: string,
): Promise<ImportState> {
    const [aircraftRows, gearRows, jumpRows, jumpTypeRows, locationRows] =
        await Promise.all([
            db
                .select({ uuid: aircrafts.uuid, name: aircrafts.name })
                .from(aircrafts)
                .where(eq(aircrafts.userUuid, userUuid)),
            db
                .select({ uuid: gear.uuid, name: gear.name })
                .from(gear)
                .where(eq(gear.userUuid, userUuid)),
            db
                .select({ uuid: jumps.uuid, jumpNumber: jumps.jumpNumber })
                .from(jumps)
                .where(eq(jumps.userUuid, userUuid)),
            db
                .select({ uuid: jumpTypes.uuid, name: jumpTypes.name })
                .from(jumpTypes)
                .where(eq(jumpTypes.userUuid, userUuid)),
            db
                .select({ uuid: locations.uuid, name: locations.name })
                .from(locations)
                .where(eq(locations.userUuid, userUuid)),
        ]);
    return {
        db,
        userUuid,
        resources: {
            aircraft: resourceMap(aircraftRows),
            gear: resourceMap(gearRows),
            jumpType: resourceMap(jumpTypeRows),
            location: resourceMap(locationRows),
        },
        jumpUuids: new Map(
            jumpRows.map((jump) => [jump.jumpNumber, jump.uuid]),
        ),
        queries: [],
    };
}

/** Adds a database query with a user-facing description if it fails. */
function queueQuery(
    state: ImportState,
    description: string,
    query: { run(): Promise<unknown> },
) {
    state.queries.push({ description, run: () => query.run() });
}

/** Queues insertion of a resource and records its UUID for later references. */
function queueResource(
    state: ImportState,
    type: ResourceType,
    name: string,
    previousCount: number,
    description: string | null | undefined,
): string {
    const uuid = crypto.randomUUID();
    state.resources[type].set(normalizeName(name), uuid);
    if (type === "aircraft") {
        queueQuery(
            state,
            `creating aircraft ${JSON.stringify(name)}`,
            state.db.insert(aircrafts).values({
                uuid,
                userUuid: state.userUuid,
                name,
                previousJumpCount: previousCount,
                description: description || null,
            }),
        );
    } else if (type === "gear") {
        queueQuery(
            state,
            `creating gear ${JSON.stringify(name)}`,
            state.db.insert(gear).values({
                uuid,
                userUuid: state.userUuid,
                name,
                previousUsageCount: previousCount,
                description: description || null,
            }),
        );
    } else if (type === "jumpType") {
        queueQuery(
            state,
            `creating jump type ${JSON.stringify(name)}`,
            state.db.insert(jumpTypes).values({
                uuid,
                userUuid: state.userUuid,
                name,
                previousUsageCount: previousCount,
                description: description || null,
            }),
        );
    } else {
        queueQuery(
            state,
            `creating location ${JSON.stringify(name)}`,
            state.db.insert(locations).values({
                uuid,
                userUuid: state.userUuid,
                name,
                previousJumpCount: previousCount,
                description: description || null,
            }),
        );
    }
    return uuid;
}

/** Queues explicitly listed resources that are not already present. */
function queueListedResources(records: ImportRecord[], state: ImportState) {
    for (const record of records) {
        if (record.type === "jump") {
            continue;
        }
        if (state.resources[record.type].has(normalizeName(record.name))) {
            continue;
        }
        queueResource(
            state,
            record.type,
            record.name,
            record.previousCount,
            record.description,
        );
    }
}

/** Queues a jump upsert along with its resource and relation changes. */
function queueJump(
    record: Extract<ImportRecord, { type: "jump" }>,
    state: ImportState,
) {
    const existingJumpUuid = state.jumpUuids.get(record.jumpNumber);
    const jumpUuid = existingJumpUuid ?? crypto.randomUUID();
    state.jumpUuids.set(record.jumpNumber, jumpUuid);
    const locationUuid =
        state.resources.location.get(normalizeName(record.location)) ??
        queueResource(state, "location", record.location, 0, null);
    const aircraftUuid =
        state.resources.aircraft.get(normalizeName(record.aircraft)) ??
        queueResource(state, "aircraft", record.aircraft, 0, null);
    const gearByUuid = new Map<string, string>();
    for (const name of record.gear) {
        const gearUuid =
            state.resources.gear.get(normalizeName(name)) ??
            queueResource(state, "gear", name, 0, null);
        gearByUuid.set(gearUuid, name);
    }
    const jumpTypeByUuid = new Map<string, string>();
    for (const name of record.jumpTypes) {
        const jumpTypeUuid =
            state.resources.jumpType.get(normalizeName(name)) ??
            queueResource(state, "jumpType", name, 0, null);
        jumpTypeByUuid.set(jumpTypeUuid, name);
    }
    const jumpValues = {
        locationUuid,
        aircraftUuid,
        exitAltitude: record.exitAltitude,
        openingAltitude: record.openingAltitude,
        freefallTime: record.freefallTime,
        description: record.description || null,
    };
    if (existingJumpUuid) {
        queueQuery(
            state,
            `updating jump #${record.jumpNumber}`,
            state.db
                .update(jumps)
                .set(jumpValues)
                .where(eq(jumps.uuid, jumpUuid)),
        );
        queueQuery(
            state,
            `replacing gear on jump #${record.jumpNumber}`,
            state.db
                .delete(jumpsToGear)
                .where(eq(jumpsToGear.jumpUuid, jumpUuid)),
        );
        queueQuery(
            state,
            `replacing jump types on jump #${record.jumpNumber}`,
            state.db
                .delete(jumpsToJumpTypes)
                .where(eq(jumpsToJumpTypes.jumpUuid, jumpUuid)),
        );
    } else {
        queueQuery(
            state,
            `creating jump #${record.jumpNumber}`,
            state.db.insert(jumps).values({
                uuid: jumpUuid,
                userUuid: state.userUuid,
                jumpNumber: record.jumpNumber,
                ...jumpValues,
            }),
        );
    }
    for (const [gearUuid, gearName] of gearByUuid) {
        queueQuery(
            state,
            `linking gear ${JSON.stringify(gearName)} to jump #${record.jumpNumber}`,
            state.db.insert(jumpsToGear).values({ jumpUuid, gearUuid }),
        );
    }
    for (const [jumpTypeUuid, jumpTypeName] of jumpTypeByUuid) {
        queueQuery(
            state,
            `linking jump type ${JSON.stringify(jumpTypeName)} to jump #${record.jumpNumber}`,
            state.db
                .insert(jumpsToJumpTypes)
                .values({ jumpUuid, jumpTypeUuid }),
        );
    }
}

/** Queues all jump records and returns their count. */
function queueJumps(records: ImportRecord[], state: ImportState): number {
    let importedJumps = 0;
    for (const record of records) {
        if (record.type !== "jump") {
            continue;
        }
        queueJump(record, state);
        importedJumps++;
    }
    return importedJumps;
}

/** Imports validated records for the current user. */
async function importRecords(c: AppRequestContext, records: ImportRecord[]) {
    const context = getAppContext(c);
    const state = await createImportState(context.db, context.getUser().uuid);
    queueListedResources(records, state);
    const importedJumps = queueJumps(records, state);
    for (const query of state.queries) {
        try {
            await query.run();
        } catch (error) {
            console.error(
                `Logbook import failed while ${query.description}`,
                error,
            );
            throw new Error(
                `Could not complete the import while ${query.description}. The import may be partially complete.`,
            );
        }
    }
    return importedJumps;
}

/** Handles an uploaded logbook import file. */
async function handleTransfer(c: AppRequestContext) {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
        return c.render(
            <TransferPage errors={["Choose a logbook file to import"]} />,
        );
    }
    const result = await readImportRecords(file);
    if ("errors" in result) {
        return c.render(<TransferPage errors={result.errors} />);
    }
    try {
        const importedJumps = await importRecords(c, result.records);
        return c.render(
            <TransferPage
                notice={`Imported ${importedJumps} ${importedJumps === 1 ? "jump" : "jumps"}`}
            />,
        );
    } catch (error) {
        return c.render(
            <TransferPage
                errors={[
                    error instanceof Error
                        ? error.message
                        : "Could not complete the import. The import may be partially complete.",
                ]}
            />,
        );
    }
}

/** Exports the current user's logbook as a JSON Lines download. */
async function exportLogbook(c: AppRequestContext) {
    const ctx = getAppContext(c);
    const db = ctx.db;
    const userUuid = ctx.getUser().uuid;
    const [aircraftRows, gearRows, jumpTypeRows, locationRows, jumpRows] =
        await Promise.all([
            db
                .select()
                .from(aircrafts)
                .where(eq(aircrafts.userUuid, userUuid))
                .orderBy(aircrafts.name),
            db
                .select()
                .from(gear)
                .where(eq(gear.userUuid, userUuid))
                .orderBy(gear.name),
            db
                .select()
                .from(jumpTypes)
                .where(eq(jumpTypes.userUuid, userUuid))
                .orderBy(jumpTypes.name),
            db
                .select()
                .from(locations)
                .where(eq(locations.userUuid, userUuid))
                .orderBy(locations.name),
            db
                .select({
                    uuid: jumps.uuid,
                    jumpNumber: jumps.jumpNumber,
                    exitAltitude: jumps.exitAltitude,
                    openingAltitude: jumps.openingAltitude,
                    freefallTime: jumps.freefallTime,
                    description: jumps.description,
                    location: locations.name,
                    aircraft: aircrafts.name,
                })
                .from(jumps)
                .innerJoin(locations, eq(jumps.locationUuid, locations.uuid))
                .innerJoin(aircrafts, eq(jumps.aircraftUuid, aircrafts.uuid))
                .where(eq(jumps.userUuid, userUuid))
                .orderBy(jumps.jumpNumber),
        ]);
    const [jumpGearRows, jumpTypeRelationRows] = await Promise.all([
        db
            .select({ jumpUuid: jumpsToGear.jumpUuid, name: gear.name })
            .from(jumpsToGear)
            .innerJoin(gear, eq(jumpsToGear.gearUuid, gear.uuid))
            .innerJoin(jumps, eq(jumpsToGear.jumpUuid, jumps.uuid))
            .where(eq(jumps.userUuid, userUuid)),
        db
            .select({
                jumpUuid: jumpsToJumpTypes.jumpUuid,
                name: jumpTypes.name,
            })
            .from(jumpsToJumpTypes)
            .innerJoin(
                jumpTypes,
                eq(jumpsToJumpTypes.jumpTypeUuid, jumpTypes.uuid),
            )
            .innerJoin(jumps, eq(jumpsToJumpTypes.jumpUuid, jumps.uuid))
            .where(eq(jumps.userUuid, userUuid)),
    ]);
    const gearByJump = new Map<string, string[]>();
    const jumpTypesByJump = new Map<string, string[]>();
    for (const row of jumpGearRows) {
        gearByJump.set(row.jumpUuid, [
            ...(gearByJump.get(row.jumpUuid) ?? []),
            row.name,
        ]);
    }
    for (const row of jumpTypeRelationRows) {
        jumpTypesByJump.set(row.jumpUuid, [
            ...(jumpTypesByJump.get(row.jumpUuid) ?? []),
            row.name,
        ]);
    }
    const records = [
        ...aircraftRows.map((row) => ({
            type: "aircraft",
            name: row.name,
            previousCount: row.previousJumpCount,
            description: row.description,
        })),
        ...gearRows.map((row) => ({
            type: "gear",
            name: row.name,
            previousCount: row.previousUsageCount,
            description: row.description,
        })),
        ...jumpTypeRows.map((row) => ({
            type: "jumpType",
            name: row.name,
            previousCount: row.previousUsageCount,
            description: row.description,
        })),
        ...locationRows.map((row) => ({
            type: "location",
            name: row.name,
            previousCount: row.previousJumpCount,
            description: row.description,
        })),
        ...jumpRows.map((row) => ({
            type: "jump",
            jumpNumber: row.jumpNumber,
            exitAltitude: row.exitAltitude,
            openingAltitude: row.openingAltitude,
            freefallTime: row.freefallTime,
            location: row.location,
            aircraft: row.aircraft,
            gear: gearByJump.get(row.uuid) ?? [],
            jumpTypes: jumpTypesByJump.get(row.uuid) ?? [],
            description: row.description,
        })),
    ];
    return c.body(
        records.map((record) => JSON.stringify(record)).join("\n") + "\n",
        200,
        {
            "Content-Disposition": 'attachment; filename="jump-logbook.jsonl"',
            "Content-Type": "application/x-ndjson; charset=utf-8",
        },
    );
}

app.get(routes.logbookTransfer.route, (c) => c.render(<TransferPage />));
app.post(routes.logbookTransfer.route, handleTransfer);
app.get(routes.logbookExport.route, exportLogbook);
