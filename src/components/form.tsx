import clsx from "clsx";

const labelClassName = "block text-sm font-medium text-gray-700";
const controlClassName =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2";

export function Input(props: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    autofocus?: boolean;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
}) {
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <input
                name={props.name}
                type={props.type ?? "text"}
                required={props.required}
                autofocus={props.autofocus}
                value={props.value}
                defaultValue={props.defaultValue}
                placeholder={props.placeholder}
                className={clsx(controlClassName, props.inputClassName)}
            />
        </label>
    );
}

export function NumberInput(props: {
    name: string;
    label: string;
    min?: string;
    required?: boolean;
    autofocus?: boolean;
    value?: string;
    defaultValue?: string;
    className?: string;
    inputClassName?: string;
}) {
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <input
                name={props.name}
                type="number"
                min={props.min}
                required={props.required}
                autofocus={props.autofocus}
                value={props.value}
                defaultValue={props.defaultValue}
                className={clsx(controlClassName, props.inputClassName)}
            />
        </label>
    );
}

export function Select(props: {
    name: string;
    label: string;
    required?: boolean;
    defaultValue?: string;
    className?: string;
    selectClassName?: string;
    children: any;
}) {
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <select
                name={props.name}
                required={props.required}
                defaultValue={props.defaultValue}
                className={clsx(controlClassName, props.selectClassName)}
            >
                {props.children}
            </select>
        </label>
    );
}

export function Textarea(props: {
    name: string;
    label: string;
    rows?: number;
    defaultValue?: string;
    className?: string;
    textareaClassName?: string;
}) {
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <textarea
                name={props.name}
                rows={props.rows ?? 4}
                defaultValue={props.defaultValue}
                className={clsx(controlClassName, props.textareaClassName)}
            />
        </label>
    );
}

export function Checkbox(props: {
    name: string;
    value: string;
    label: string;
    checked?: boolean;
    className?: string;
}) {
    return (
        <label
            className={clsx(
                "flex items-center gap-2 rounded border border-gray-200 px-3 py-2 text-sm",
                props.className,
            )}
        >
            <input
                name={props.name}
                type="checkbox"
                value={props.value}
                checked={props.checked}
            />
            {props.label}
        </label>
    );
}

export function FormActions(props: {
    submitLabel: string;
    cancelHref: string;
}) {
    return (
        <div className="flex gap-3">
            <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
                {props.submitLabel}
            </button>
            <a
                href={props.cancelHref}
                className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
                Cancel
            </a>
        </div>
    );
}
