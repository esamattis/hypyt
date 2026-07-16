import { XMLParser } from "fast-xml-parser";
import type { ImportRecord } from "@/route-handlers/logbook/transfer";

type ResourceType = Exclude<ImportRecord["type"], "jump">;

interface XmlCatalog {
    records: Exclude<ImportRecord, { type: "jump" }>[];
    namesById: Map<string, string>;
}

function normalizeName(name: string): string {
    return name.trim().toLocaleLowerCase();
}

function addCutawayJumpType(
    jumpTypeNames: string[],
    hasCutaway: boolean,
): string[] {
    return hasCutaway &&
        !jumpTypeNames.some((name) => normalizeName(name) === "cutaway")
        ? [...jumpTypeNames, "Cutaway"]
        : jumpTypeNames;
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

function resolveXmlNames(config: {
    ids: string[];
    catalog: XmlCatalog;
    resourceName: string;
    errors: string[];
    jumpNumber: number;
}): string[] {
    return config.ids.flatMap((id) => {
        const name = config.catalog.namesById.get(id);
        if (name) {
            return [name];
        }
        config.errors.push(
            `Jump #${config.jumpNumber}: unknown ${config.resourceName} ID ${JSON.stringify(id)}`,
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

/** Parses a Skydiving Logbook XML document into logbook import records. */
export function parseSkydivingLogbookXml(xml: string): ImportRecord[] {
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
    let needsCutawayType = false;
    for (const item of xmlItems(
        xmlObject(logbook.log_entries, "log_entries").log_entry,
    )) {
        const record = xmlObject(item, "log_entry");
        const jumpNumber = xmlNumber(record, "jump_number", 1);
        const locationId = xmlString(record, "location_id");
        const aircraftId = xmlString(record, "aircraft_id");
        const location = locationId
            ? resolveXmlNames({
                  ids: [locationId],
                  catalog: locations,
                  resourceName: "location",
                  errors,
                  jumpNumber,
              })[0]
            : "Unknown location";
        const aircraftName = aircraftId
            ? resolveXmlNames({
                  ids: [aircraftId],
                  catalog: aircraft,
                  resourceName: "aircraft",
                  errors,
                  jumpNumber,
              })[0]
            : "Unknown aircraft";
        if (!location || !aircraftName) {
            continue;
        }
        needsUnknownLocation ||= !locationId;
        needsUnknownAircraft ||= !aircraftId;
        const description = xmlString(record, "notes");
        const cutaway = xmlString(record, "cutaway");
        needsCutawayType ||= cutaway === "true";
        const resolvedJumpTypes = resolveXmlNames({
            ids: xmlString(record, "skydive_type_id")
                ? [requiredXmlString(record, "skydive_type_id")]
                : [],
            catalog: jumpTypes,
            resourceName: "skydive type",
            errors,
            jumpNumber,
        });
        const jumpTypesWithCutaway = addCutawayJumpType(
            resolvedJumpTypes,
            cutaway === "true",
        );
        jumps.push({
            type: "jump",
            jumpNumber,
            jumpDate: requiredXmlString(record, "date"),
            exitAltitude: xmlNumber(record, "exit_altitude", 1),
            openingAltitude: xmlNumber(record, "deployment_altitude", 0),
            freefallTime: xmlNumber(record, "freefall_time", 0),
            location,
            aircraft: [aircraftName],
            gear: resolveXmlNames({
                ids: xmlRigIds(record),
                catalog: gearCatalog,
                resourceName: "rig",
                errors,
                jumpNumber,
            }),
            jumpTypes: jumpTypesWithCutaway,
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
        ...(needsCutawayType &&
        !jumpTypes.records.some(
            (record) => normalizeName(record.name) === "cutaway",
        )
            ? [
                  {
                      type: "jumpType" as const,
                      name: "Cutaway",
                      previousCount: 0,
                  },
              ]
            : []),
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
