"use server";

import { createClient } from "@/lib/supabase/server";

export async function debugAuth() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { error: "Not authenticated" };
    }

    return {
        userId: user.id,
        email: user.email,
        appMetadata: user.app_metadata,
        userMetadata: user.user_metadata,
        isAdmin: user.app_metadata?.is_admin
    };
}
