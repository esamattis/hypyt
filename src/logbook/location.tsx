import { getAppContext, app, type AppRequestContext } from "../app";
import { FormActions, Input, NumberInput, Textarea } from "../components/form";
import { ErrorList } from "../components/feedback";
import * as routes from "../routes";
import { locations } from "../schema";
import { LogbookPage } from "./layout";
import { ResourceSchema } from "./resource";

function NewLocationPage(props: { errors?: string[] }) {
    return (
        <LogbookPage title="Add location">
            <form
                method="post"
                className="max-w-xl space-y-5 rounded-lg bg-white p-5 shadow-sm"
            >
                <ErrorList
                    errors={props.errors ?? []}
                    className="border-red-300 bg-red-50 text-red-800"
                />
                <Input name="name" label="Name" required autofocus />
                <NumberInput
                    name="previousCount"
                    label="Previous jump count"
                    min="0"
                    required
                    value="0"
                />
                <Textarea name="description" label="Description" />
                <FormActions
                    submitLabel="Add location"
                    cancelHref={routes.logbook({})}
                />
            </form>
        </LogbookPage>
    );
}

async function handleNewLocation(c: AppRequestContext) {
    const formData = await c.req.formData();
    const result = ResourceSchema.safeParse({
        name: formData.get("name"),
        previousCount: formData.get("previousCount"),
        description: formData.get("description"),
    });
    if (!result.success) {
        return c.render(
            <NewLocationPage
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    await getAppContext(c)
        .db.insert(locations)
        .values({
            userUuid: getAppContext(c).getUser().uuid,
            name: result.data.name,
            previousJumpCount: result.data.previousCount,
            description: result.data.description || null,
        });
    return c.redirect(routes.logbook({}));
}

app.get(routes.locationNew.route, (c) => c.render(<NewLocationPage />));
app.post(routes.locationNew.route, handleNewLocation);
