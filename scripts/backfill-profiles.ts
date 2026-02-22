// scripts/backfill-profiles.ts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Extract env from Next.js local files
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

// Ensure we use the service role key to bypass RLS and access auth.users
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  console.log("Starting User Profiles backfill...");

  // 1. Fetch all existing users from auth.users
  const {
    data: { users },
    error: usersError,
  } = await supabaseAdmin.auth.admin.listUsers();

  if (usersError) {
    console.error("Failed to fetch users:", usersError);
    return;
  }

  console.log(`Found ${users.length} total users.`);

  // 2. Fetch all existing profiles to avoid duplicates/unnecessary logic
  const { data: existingProfiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, username");

  if (profilesError) {
    console.error("Failed to fetch profiles:", profilesError);
    return;
  }

  const existingProfileIds = new Set(existingProfiles?.map((p) => p.id));
  const existingUsernames = new Set(existingProfiles?.map((p) => p.username));

  // Users who haven't been backfilled yet
  const usersToProcess = users.filter(
    (u: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    }) => !existingProfileIds.has(u.id),
  );

  console.log(`Found ${usersToProcess.length} users missing a profile.`);

  if (usersToProcess.length === 0) {
    console.log("Backfill complete. No further action needed.");
    return;
  }

  let totalSuccess = 0;
  let totalErrors = 0;

  for (const user of usersToProcess) {
    try {
      // 1. Check if user already has a saved username in metadata
      let requestedUsername = user.user_metadata?.username;

      // 2. If no username is set, parse the email suffix
      if (!requestedUsername || requestedUsername.trim() === "") {
        const email = user.email || "";
        requestedUsername = email.split("@")[0] || "user";
      }

      requestedUsername = requestedUsername.trim();

      // 3. Collision Logic: Check if the username is already taken.
      // E.g., if "xyz" exists, try "xyz-1", "xyz-2", etc.
      let finalUsername = requestedUsername;
      let counter = 1;

      while (existingUsernames.has(finalUsername)) {
        finalUsername = `${requestedUsername}-${counter}`;
        counter++;
      }

      // Add to our running list of unavailable usernames to prevent collision in the *same batch*
      existingUsernames.add(finalUsername);

      // 4. Upsert the profile
      const { error: upsertError } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: user.id,
            username: finalUsername,
            avatar_url: user.user_metadata?.avatar_url || null,
            // Updated_at / Created_at are handled by default values in SQL
          },
          { onConflict: "id" },
        );

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      totalSuccess++;
      console.log(`[SUCCESS] User ${user.id} -> @${finalUsername}`);
    } catch (err: unknown) {
      totalErrors++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[ERROR] Failed to process user ${user.id}:`, errorMessage);
    }
  }

  console.log("\n--- Backfill Summary ---");
  console.log(`Successfully Backfilled: ${totalSuccess}`);
  console.log(`Failed: ${totalErrors}`);
  console.log("------------------------\n");
}

run().catch(console.error);
