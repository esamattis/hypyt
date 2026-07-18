import { useId } from "hono/jsx";
import { Button } from "@/components/form";
import { Script } from "@/components/script";
import {
    DarkThemeIcon,
    LightThemeIcon,
    SystemThemeIcon,
} from "@/components/icons";
import { $select } from "@/utils";

export function $initThemeToggle(ids: {
    buttonId: string;
    lightIconId: string;
    darkIconId: string;
    systemIconId: string;
}) {
    const button = $select.id(ids.buttonId, HTMLButtonElement);
    const lightIcon = $select.id(ids.lightIconId, SVGSVGElement);
    const darkIcon = $select.id(ids.darkIconId, SVGSVGElement);
    const systemIcon = $select.id(ids.systemIconId, SVGSVGElement);

    function getStoredTheme(): "light" | "dark" | "system" {
        try {
            const value = localStorage.getItem("theme");
            if (value === "light" || value === "dark" || value === "system") {
                return value;
            }
        } catch (error) {
            console.error("Failed to read the stored theme", error);
        }
        return "system";
    }

    function applyTheme(theme: "light" | "dark" | "system") {
        const resolved =
            theme === "system"
                ? window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light"
                : theme;
        document.documentElement.classList.toggle("dark", resolved === "dark");
        document.documentElement.style.colorScheme = resolved;
    }

    const labels = {
        light: "Theme: Light. Click for dark",
        dark: "Theme: Dark. Click for system",
        system: "Theme: System. Click for light",
    } as const;
    const nextTheme = {
        light: "dark",
        dark: "system",
        system: "light",
    } as const;

    function updateUi(theme: "light" | "dark" | "system") {
        lightIcon.classList.toggle("hidden", theme !== "light");
        darkIcon.classList.toggle("hidden", theme !== "dark");
        systemIcon.classList.toggle("hidden", theme !== "system");
        button.setAttribute("aria-label", labels[theme]);
        button.dataset.lokiTooltip = labels[theme];
    }

    function setTheme(theme: "light" | "dark" | "system") {
        try {
            localStorage.setItem("theme", theme);
        } catch (error) {
            console.error("Failed to store the selected theme", error);
        }
        applyTheme(theme);
        updateUi(theme);
    }

    updateUi(getStoredTheme());

    button.addEventListener("click", () => {
        setTheme(nextTheme[getStoredTheme()]);
    });

    window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
            if (getStoredTheme() === "system") {
                applyTheme("system");
            }
        });
}

export function ThemeToggle() {
    const id = useId();
    const lightIconId = `${id}-light`;
    const darkIconId = `${id}-dark`;
    const systemIconId = `${id}-system`;

    return (
        <>
            <Button
                id={id}
                type="button"
                variant="secondary"
                aria-label="Toggle theme"
                data-loki-tooltip="Toggle theme"
                className="px-3 py-2 text-sm"
            >
                <LightThemeIcon id={lightIconId} className="hidden h-4 w-4" />
                <DarkThemeIcon id={darkIconId} className="hidden h-4 w-4" />
                <SystemThemeIcon id={systemIconId} className="h-4 w-4" />
            </Button>
            <Script
                $deps={[$select]}
                $args={[
                    {
                        buttonId: id,
                        lightIconId,
                        darkIconId,
                        systemIconId,
                    },
                ]}
                $exec={$initThemeToggle}
            />
        </>
    );
}
