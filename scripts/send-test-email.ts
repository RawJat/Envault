import { sendTestEmail } from "../src/lib/email";
import { getEmailHtml } from "../src/lib/email-html";

const email = "dashdinanath056@gmail.com";

console.log(`Sending test email to ${email}...`);
console.log(
  "Using standard Envault HTML email template via sendTestEmail()...",
);

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("Error: RESEND_API_KEY is not set in environment variables.");
    process.exit(1);
  }

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

  const result = await sendTestEmail(email);
  if (result && result.success) {
    console.log("Email sent successfully!");
    console.log("Message ID:", result.data?.id);
  } else {
    console.error("Failed to send email.");
    console.error(result ? result.error : "Unknown error");
  }
}

main().catch(console.error);
