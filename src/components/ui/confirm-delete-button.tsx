import clsx from "clsx";
import { ConfirmDangerButton } from "./confirm-danger-button";

export function ConfirmDeleteButton(props: {
    label: string;
    className?: string;
}) {
    return (
        <form method="post" className={clsx("flex", props.className)}>
            <input type="hidden" name="action" value="delete" />
            <ConfirmDangerButton
                label={props.label}
                confirmLabel="Confirm delete"
            />
        </form>
    );
}
