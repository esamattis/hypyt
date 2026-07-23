import { eq } from "drizzle-orm";
import { getAppContext, type AppRequestContext } from "@/app/app";
import { destroySession } from "@/route-handlers/auth/sessions";
import { aiUsage, users } from "@/schema";

const DELETED_ACCOUNT_AI_USAGE_TITLE = "Deleted account";

export async function deleteAccount(c: AppRequestContext) {
    const ctx = getAppContext(c);
    const user = ctx.getUser();
    // Scrub AI usage titles before delete. ai_usage keeps rows (ON DELETE SET
    // NULL); logbook data and sessions cascade-delete.
    await ctx.db
        .update(aiUsage)
        .set({ title: DELETED_ACCOUNT_AI_USAGE_TITLE })
        .where(eq(aiUsage.userUuid, user.uuid));
    await ctx.db.delete(users).where(eq(users.uuid, user.uuid));
    await destroySession(c);
}
