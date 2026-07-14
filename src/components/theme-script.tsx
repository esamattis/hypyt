import { Script } from "@/components/script";

function $applyStoredTheme() {
    try {
        let theme = localStorage.getItem("theme");
        if (theme !== "light" && theme !== "dark") theme = "system";
        const isDark =
            theme === "dark" ||
            (theme === "system" &&
                matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    } catch (error) {
        console.error("Failed to apply the stored theme", error);
    }
}

export function ThemeScript() {
    return <Script $exec={$applyStoredTheme} />;
}
