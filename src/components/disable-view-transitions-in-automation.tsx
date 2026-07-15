import { html, Script } from "@/components/script";

function $disableViewTransitionsInAutomation() {
    if (!navigator.webdriver) return;
    document.head.insertAdjacentHTML(
        "beforeend",
        html`
            <style>
                @view-transition {
                    navigation: none;
                }
            </style>
        `,
    );
}

export function DisableViewTransitionsInAutomation() {
    return (
        <Script $deps={[html]} $exec={$disableViewTransitionsInAutomation} />
    );
}
