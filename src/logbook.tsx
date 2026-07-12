import { desc, eq } from "drizzle-orm";
import { app, getAppContext, type AppRequestContext } from "./app";
import * as routes from "./routes";
import { aircrafts, jumps, locations } from "./schema";
import { Script } from "./components/helpers";
import { LogbookPage } from "./logbook/layout";
import "./logbook/aircraft";
import "./logbook/gear";
import "./logbook/jump";
import "./logbook/jump-type";
import "./logbook/location";
import "./logbook/transfer";
import { useId } from "hono/jsx";
import { $assertElement } from "./utils";

function LogbookManagementMenu() {
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
                className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
                Manage logbook
            </button>
            <div
                id={menuId}
                hidden
                className="absolute left-0 z-10 mt-2 w-52 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
            >
                <a
                    href={routes.aircraftList({})}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    Manage aircraft
                </a>
                <a
                    href={routes.gearList({})}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    Manage gear
                </a>
                <a
                    href={routes.jumpTypeList({})}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    Manage jump types
                </a>
                <a
                    href={routes.locationList({})}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    Manage locations
                </a>
                <a
                    href={routes.logbookTransfer({})}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
                    }

                    button.addEventListener("click", () => {
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

async function renderLogbook(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const jumpRows = await db
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
        .where(eq(jumps.userUuid, userUuid))
        .orderBy(desc(jumps.jumpNumber));

    return c.render(
        <LogbookPage title="Jump Logbook">
            <nav className="flex flex-wrap gap-3">
                <a
                    href={routes.jumpNew({}, {})}
                    className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                    Add jump
                </a>
                <LogbookManagementMenu />
            </nav>
            <section className="overflow-hidden rounded-lg bg-white shadow-sm">
                <h2 className="border-b border-gray-200 px-5 py-4 text-lg font-semibold">
                    Jumps
                </h2>
                {jumpRows.length === 0 ? (
                    <p className="p-5 text-gray-600">No jumps yet.</p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {jumpRows.map((jump) => (
                            <li>
                                <a
                                    href={routes.jumpEdit({ uuid: jump.uuid })}
                                    className="block px-5 py-4 hover:bg-gray-50"
                                >
                                    <span className="font-semibold text-blue-700">
                                        Jump #{jump.jumpNumber}
                                    </span>
                                    <span className="ml-3 text-sm text-gray-600">
                                        {jump.locationName} /{" "}
                                        {jump.aircraftName}
                                    </span>
                                    <span className="mt-1 block text-sm text-gray-600">
                                        Exit {jump.exitAltitude} m / Opening{" "}
                                        {jump.openingAltitude} m / Freefall{" "}
                                        {jump.freefallTime} s
                                    </span>
                                    {jump.description && (
                                        <span className="mt-1 block text-sm text-gray-600">
                                            {jump.description}
                                        </span>
                                    )}
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </LogbookPage>,
    );
}

app.get(routes.logbook.route, renderLogbook);
