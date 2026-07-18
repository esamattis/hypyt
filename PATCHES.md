# Dependency patches

## Drizzle ORM 1.0.0-rc.4

Patch: [`patches/drizzle-orm@1.0.0-rc.4.patch`](patches/drizzle-orm@1.0.0-rc.4.patch)

Drizzle Kit's `d1-http` migration driver uses the SQLite proxy in array mode
when reading migration metadata. Drizzle ORM routes those reads through the
proxy's object-mode `all` method, while the migration code expects arrays. The
resulting object rows are destructured as arrays and produce missing migration
metadata.

The bug causes repeat migrations to fail with errors such as:

```text
While upgrading your database migrations table we found 1
([id: undefined, created_at: undefined]) migrations in the database that do
not match any local migration.
```

The patch routes array-mode `all` calls and direct `values` calls through the
proxy's `values` method. For D1 HTTP this selects the `/raw` endpoint, which
returns the array rows expected by the migrator. This makes
`drizzle-kit migrate` idempotent without changing migration data.

Remove the patch after upgrading to a Drizzle ORM release that includes the
same SQLite proxy routing fix.
