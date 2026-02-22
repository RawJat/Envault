import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing Supabase URL or Service Role Key in environment variables.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Sanitizes a project name to create a valid URL slug.
 */
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars (excluding spaces and hyphens)
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with a single hyphen
    .replace(/^-+|-+$/g, ""); // Trim hyphens from start and end
}

/**
 * Checks if a given user_id + slug combination already exists.
 */
async function slugExists(
  userId: string,
  targetSlug: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", targetSlug)
    .maybeSingle();

  if (error) {
    console.error(
      `Error checking slug existence for target ${targetSlug}:`,
      error,
    );
    throw error;
  }

  return !!data;
}

/**
 * Generates a unique slug for a project.
 */
async function generateUniqueSlug(
  userId: string,
  initialSlug: string,
): Promise<string> {
  let slug = initialSlug || "project"; // Fallback if name sanitization results in empty string
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const targetSlug = counter === 1 ? slug : `${slug}-${counter}`;
    const exists = await slugExists(userId, targetSlug);

    if (!exists) {
      isUnique = true;
      slug = targetSlug;
    } else {
      counter++;
    }
  }

  return slug;
}

async function backfillSlugs() {
  console.log("Starting project slug backfill...");

  // 1. Fetch all projects that do not have a slug yet
  const { data: projects, error: fetchError } = await supabase
    .from("projects")
    .select("id, name, user_id")
    .is("slug", null);

  if (fetchError) {
    console.error("Error fetching projects:", fetchError);
    process.exit(1);
  }

  const projectsToUpdate = projects || [];
  console.log(`Found ${projectsToUpdate.length} projects without a slug.`);

  if (projectsToUpdate.length === 0) {
    console.log("Backfill complete. No action needed.");
    return;
  }

  // 2. Process each project, generate unique slug, and update
  let successCount = 0;
  let errorCount = 0;

  for (const project of projectsToUpdate) {
    try {
      const baseSlug = createSlug(project.name);
      // Ensure we check for collisions per-user because uniqueness is (user_id, slug)
      const uniqueSlug = await generateUniqueSlug(project.user_id, baseSlug);

      console.log(
        `Updating project "${project.name}" (${project.id}) -> slug: "${uniqueSlug}"`,
      );

      const { error: updateError } = await supabase
        .from("projects")
        .update({ slug: uniqueSlug })
        .eq("id", project.id);

      if (updateError) {
        console.error(`Failed to update project ${project.id}:`, updateError);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err) {
      console.error(`Unexpected error processing project ${project.id}:`, err);
      errorCount++;
    }
  }

  console.log("\n--- Backfill Summary ---");
  console.log(`Total Processed: ${projectsToUpdate.length}`);
  console.log(`Successfully Updated: ${successCount}`);
  console.log(`Errors Encounters: ${errorCount}`);
}

backfillSlugs().catch(console.error);
