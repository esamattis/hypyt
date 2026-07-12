const JSONL_EXAMPLE = `{"type":"aircraft","name":"Twin Otter","previousCount":120,"description":"Fast turbine aircraft"}
{"type":"gear","name":"Navigator 260","previousCount":42,"description":"Main canopy"}
{"type":"jumpType","name":"Formation skydiving","previousCount":18,"description":"Four-way training"}
{"type":"location","name":"Skydive Example","previousCount":300,"description":"Home drop zone"}
{"type":"jump","jumpNumber":301,"exitAltitude":4000,"openingAltitude":1000,"freefallTime":55,"location":"Skydive Example","aircraft":"Twin Otter","gear":["Navigator 260"],"jumpTypes":["Formation skydiving"],"description":"Training jump"}`;

export function TransferFormatHelp() {
    return (
        <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <summary className="cursor-pointer font-medium text-slate-900 marker:hidden list-none">
                Export file format
            </summary>
            <div className="mt-3 space-y-3">
                <p>
                    Export files use JSON Lines: one JSON object per line.
                    Resources appear before jumps, which refer to them by name.
                </p>
                <p>
                    For example, this file imports an aircraft, gear, jump type,
                    location, and one jump:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                    <code>{JSONL_EXAMPLE}</code>
                </pre>
                <p>
                    Resource records require <code>type</code>,{" "}
                    <code>name</code>, and <code>previousCount</code>. Jump
                    records require <code>type</code>, <code>jumpNumber</code>,{" "}
                    <code>exitAltitude</code>, <code>openingAltitude</code>,{" "}
                    <code>freefallTime</code>, <code>location</code>, and{" "}
                    <code>aircraft</code>. Descriptions may be omitted or{" "}
                    <code>null</code>, and <code>gear</code> and{" "}
                    <code>jumpTypes</code> may be omitted or empty.
                </p>
                <p>Re-importing a jump with the same jump number updates it.</p>
            </div>
        </details>
    );
}
