import { Resend } from "resend";
import { getEmailHtml } from "./email-html";
import { Notification } from "./types/notifications";

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to determine sender email
const SENDER_DOMAIN = process.env.EMAIL_DOMAIN || "mail.envault.tech";
const SENDERS = {
  default: `Envault Team <team@${SENDER_DOMAIN}>`,
  notifications: `Envault Notifications <notifications@${SENDER_DOMAIN}>`,
  invites: `Envault Invites <invites@${SENDER_DOMAIN}>`,
  digest: `Envault Digest <digest@${SENDER_DOMAIN}>`,
};
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://envault.tech";
const LOGO_URL = `https://www.envault.tech/favicon.png`;

/**
 * Send a test email to verify Resend configuration
 */
export async function sendTestEmail(to: string) {
  try {
    const html = getEmailHtml({
      heading: "Test Email",
      content: `
        <p>This is a test email to verify your Resend configuration is working correctly.</p>
        <p>If you're seeing this, your email setup is working! 🎉</p>
      `,
      logoUrl: LOGO_URL,
    });

    const result = await resend.emails.send({
      from: SENDERS.default,
      to,
      subject: "Envault - Test Email",
      html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send test email:", error);
    return { success: false, error };
  }
}

// ============================================
// PROJECT SHARING EMAILS
// ============================================

/**
 * Send access request notification to project owner
 * Sent when someone requests access to a project
 */
export async function sendAccessRequestEmail(
  to: string, // Owner's email
  requesterEmail: string, // Who requested access
  projectName: string,
  requestId: string,
) {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log("Skipping Access Request email in DEV (No API Key).");
    return;
  }

  try {
    const html = getEmailHtml({
      heading: "New Access Request",
      content: `
        <p><strong>${requesterEmail}</strong> has requested access to your project <strong>${projectName}</strong>.</p>
        <p>Review and approve or reject this request from your dashboard.</p>
      `,
      action: {
        text: "Review Request",
        url: `${APP_URL}/approve/${requestId}`,
      },
      logoUrl: LOGO_URL,
    });

    await resend.emails.send({
      from: SENDERS.notifications,
      to,
      subject: `Access Request: ${projectName}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send access request email:", error);
  }
}

/**
 * Send project invitation email
 */
export async function sendInviteEmail(
  to: string,
  projectName: string,
  token: string,
) {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.warn(
      "Skipping email in DEV (No API Key). Invite Link:",
      `${APP_URL}/join/${token}`,
    );
    return;
  }

  try {
    const html = getEmailHtml({
      heading: `Join ${projectName}`,
      content: `
        <p>You have been invited to collaborate on the project <strong>${projectName}</strong>.</p>
        <p>Click the button below to accept the invitation and request access.</p>
      `,
      action: {
        text: "Accept Invitation",
        url: `${APP_URL}/join/${token}`,
      },
      footerText:
        "If you didn't expect this invitation, you can ignore this email.",
      logoUrl: LOGO_URL,
    });

    await resend.emails.send({
      from: SENDERS.invites,
      to,
      subject: `You've been invited to join ${projectName} on Envault`,
      html,
    });
  } catch (error) {
    console.error("Failed to send invite email:", error);
  }
}

/**
 * Send access granted notification
 */
export async function sendAccessGrantedEmail(to: string, projectName: string) {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log("Skipping Access Granted email in DEV (No API Key).");
    return;
  }

  try {
    const html = getEmailHtml({
      heading: "Access Granted",
      content: `<p>Your request to access <strong>${projectName}</strong> has been approved.</p>`,
      action: {
        text: "Go to Dashboard",
        url: `${APP_URL}/dashboard`,
      },
      logoUrl: LOGO_URL,
    });

    await resend.emails.send({
      from: SENDERS.notifications,
      to,
      subject: `Access Granted: ${projectName}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send access granted email:", error);
  }
}

/**
 * Send email digest
 */
export async function sendDigestEmail(
  to: string,
  notifications: Notification[],
  frequency: "daily" | "weekly",
) {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log(
      `Skipping Digest email in DEV (No API Key). To: ${to}, Count: ${notifications.length}`,
    );
    return;
  }

  if (notifications.length === 0) return;

  const period = frequency === "daily" ? "Daily" : "Weekly";

  // Group notifications by type or just list them
  // For simplicity, let's list the top 10 most recent
  const recent = notifications.slice(0, 10);
  const remaining = notifications.length - recent.length;

  const listItems = recent
    .map((n) => {
      const time = new Date(n.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e4e4e7;">
        <div style="font-weight: 500; font-size: 14px; color: #18181b;">${n.title}</div>
        <div style="font-size: 13px; color: #52525b;">${n.message}</div>
        <div style="font-size: 11px; color: #a1a1aa; margin-top: 4px;">${time}</div>
      </div>
    `;
    })
    .join("");

  const moreText =
    remaining > 0
      ? `<div style="font-size: 13px; color: #52525b; text-align: center; margin-top: 16px;">And ${remaining} more notifications...</div>`
      : "";

  try {
    const html = getEmailHtml({
      heading: `${period} Activity Digest`,
      content: `
        <p>Here is a summary of activity in your Envault projects for the last ${frequency === "daily" ? "24 hours" : "7 days"}.</p>
        <div style="margin-top: 24px; text-align: left;">
          ${listItems}
          ${moreText}
        </div>
      `,
      action: {
        text: "View All Activity",
        url: `${APP_URL}/notifications`,
      },
      logoUrl: LOGO_URL,
    });

    await resend.emails.send({
      from: SENDERS.digest,
      to,
      subject: `Envault - ${period} Digest`,
      html,
    });
  } catch (error) {
    console.error("Failed to send digest email:", error);
  }
}
