import clsx from "clsx";

export function ErrorList(props: { errors: string[]; className?: string }) {
    if (props.errors.length === 0) {
        return null;
    }

    return (
        <div className={clsx("rounded-md border p-3 text-sm", props.className)}>
            {props.errors.map((error) => (
                <p>{error}</p>
            ))}
        </div>
    );
}
