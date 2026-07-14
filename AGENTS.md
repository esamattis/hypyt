This is a Hono.js project using JSX. Using only server side rendering (SSR) with Hono.js and JSX.

Never destructure the `prop` parameter on the component functions. Eg. alway refer props via `props.propName`.

Use tailwindcss for styling. When using conditional classes, use the `clsx` package to combine classes.

If you need vanilla use the Css component helper:

```tsx
<Style>
  .my-class {
    color: red;
  }
</Style>
```

Also if you need client-side javascript, use the `Script` component helper:

```tsx
<Script
    $exec={() => {
        // Your client-side JavaScript code here
    }}
/>
```

These components are imported from project the helpers.tx file.

When referencing an element in the Script component, use `useId()` hook from
"hono/jsx" to generate unique ID for the element and use it in the `Script`
component via the `$args` prop. like this:

```tsx
const id = useId();
return (
    <div>
        <button id={id}>example</button>
        <Script
            $args={[id]}
            $exec={(id) => {
                const button = document.getElementById(id);
                $assertElement(button, HTMLButtonElement);
                // ..rest of the code
            }}
        />
    </div>
);
```

Always use the $assertElement(el, typeclass) to assert the elements. Ie. never use type casts or type args like `el.closest<HTMLElement>("[data-tooltip]");`

Write named functions using the `function` keyword. Use arrow functions only for anonymous functions. Callbacks etc.

All functions starting with dollar sign `$` are and should be designed so they can be executed in the browser.

Always write user interface text in English language.

Do not use React-style `defaultValue` on form controls. Hono SSR does not map it to HTML `value`. Use `value={...}` on inputs/selects (and children/`value` on textareas). For selects, mark the chosen option with `selected`.

## Terminology

"Jump items" refer to gear, locations, aircrafts and jump types that can be assigned to a jump.

## Tests

Always after every change run

```
pn test
```

## Lints

Skip lint comments are only allowed in test files. Production code should be clean of lints.

If a lint complains about too many lines in a function, consider splitting the function into smaller functions.

If it complains that file has too many lines: 1. Extract a helper function or component to a shared helpers file 2. If the helpers are local to the file, create a new directory with the original file and put the helpers there.

## Route Helpers

Use the route helper functions from routes.tsx for type-safe routing. Follow these patterns:

### Defining Routes

Define routes using the `route()` function in routes.tsx:

```tsx
export const userView = route("/user/:username");
export const userManage = route("/user/:username/manage");
```

### Generating URLs

Use the route helper's function call to generate URLs with parameters:

```tsx
// Generate URL with parameters
const url = userView({ username: "john" });
// Results in: "/user/john"

// In JSX for links
<a href={userView({ username: user.username })}>View User</a>;

// For redirects
return c.redirect(userView({ username }));
```

### Registering Route Handlers

Use the `.route` property to register handlers:

```tsx
app.get(userView.route, async (c) => {
    // Handler logic
});
```

### Extracting Route Parameters

Use the `.params()` method to extract parameters in handlers:

```tsx
app.get(userView.route, async (c) => {
    const { username } = userView.params(c);
    // username is now type-safe and decoded
});
```

Never hardcode URLs - always use the route helpers for internal navigation.
