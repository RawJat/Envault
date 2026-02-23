import * as dotenv from "dotenv";
import { resolve } from "path";

// Extract env from Next.js local files
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const recipientEmail = process.argv[2] || "dashdinanath056@gmail.com";

console.log(`Sending test email to ${recipientEmail}...`);
console.log(
  "Using standard Envault HTML email template via sendTestEmail()...",
);

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("Error: RESEND_API_KEY is not set in environment variables.");
    process.exit(1);
  }

  // Import dynamically so it evaluates after dotenv.config()
  const { sendTestEmail } = await import("../src/lib/email");
  const { getEmailHtml } = await import("../src/lib/email-html");

  // Also confirm we can generate HTML successfully
  try {
    const html = getEmailHtml({
      heading: "Template Check",
      content: "<p>Verifying template generation...</p>",
    });
    console.log(
      "Template generation successful (length: " + html.length + " chars)",
    );
  } catch (e) {
    console.error("Template generation failed:", e);
  }

  const result = await sendTestEmail(recipientEmail);
  if (result && result.success) {
    console.log("Email sent successfully!");
    console.log(
      "Message ID:",
      (result.data as { data?: { id?: string } })?.data?.id,
    );
  } else {
    console.error("Failed to send email.");
    console.error(
      result
        ? (result.error as Error)?.message || result.error
        : "Unknown error",
    );
  }
}

main().catch(console.error);
