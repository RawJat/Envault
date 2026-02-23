import { Resend } from "resend";
import { getEmailHtml } from "./email-html";
import { Notification } from "./types/notifications";

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to determine sender email
const SENDER_DOMAIN = process.env.EMAIL_DOMAIN || "mail.envault.tech";
// Each category uses a distinct sub-address so users can filter their inbox.
// All sub-addresses are on the same verified domain so deliverability is fine.
const SENDERS = {
  default: `Envault <team@${SENDER_DOMAIN}>`,
  notifications: `Envault <notifications@${SENDER_DOMAIN}>`,
  invites: `Envault Access <access@${SENDER_DOMAIN}>`,
  security: `Envault Security <security@${SENDER_DOMAIN}>`,
  activity: `Envault Activity <activity@${SENDER_DOMAIN}>`,
  cli: `Envault CLI <cli@${SENDER_DOMAIN}>`,
  system: `Envault System <system@${SENDER_DOMAIN}>`,
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
  ownerId?: string, // Added to check preferences
) {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log("Skipping Access Request email in DEV (No API Key).");
    return;
  }

  // Check notification preferences if we have an ownerId
  if (ownerId) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_access_requests")
      .eq("user_id", ownerId)
      .single();

    if (prefs && prefs.email_access_requests === false) {
      console.log(`Skipping Access Request email for ${to} (User opted out)`);
      return;
    }
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

    const { error } = await resend.emails.send({
      from: SENDERS.notifications,
      to,
      subject: `Access Request: ${projectName}`,
      html,
    });
    if (error) {
      console.error("Resend API failed to send access request email:", error);
    }
  } catch (error) {
    console.error("Failed to send access request email:", error);
  }
}

/**
 * Send new device access email
 * Sent when a user approves CLI access from a new device
 */
export async function sendNewDeviceEmail(
  to: string,
  deviceName: string,
  userId?: string,
) {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log("Skipping New Device email in DEV (No API Key).");
    return;
  }

  if (userId) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_device_activity")
      .eq("user_id", userId)
      .single();

    if (prefs && prefs.email_device_activity === false) {
      return;
    }
  }

  try {
    const html = getEmailHtml({
      heading: "CLI Access Confirmed",
      content: `
        <p>The Envault CLI on <strong>${deviceName}</strong> was successfully authenticated to your account.</p>
        <p>You can manage active CLI sessions anytime from your account settings.</p>
      `,
      action: {
        text: "Manage Sessions",
        url: `${APP_URL}/settings`,
      },
      footerText:
        "You are receiving this because new device notifications are enabled in your account.",
      logoUrl: LOGO_URL,
    });

    const { error } = await resend.emails.send({
      from: SENDERS.notifications,
      to,
      subject: "New Device Access — Envault",
      html,
    });
    if (error) {
      console.error("Resend API failed to send new device email:", error);
    }
  } catch (error) {
    console.error("Failed to send new device email:", error);
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

  // Check notification preferences if the email belongs to an existing user
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Try to find the user by email to check their preferences
  const { data: usersData } = await admin.auth.admin.listUsers();
  const existingUser = usersData.users.find((u) => u.email === to);

  if (existingUser) {
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_access_requests")
      .eq("user_id", existingUser.id)
      .single();

    if (prefs && prefs.email_access_requests === false) {
      console.log(`Skipping Invite email for ${to} (User opted out)`);
      return;
    }
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

    const { error } = await resend.emails.send({
      from: SENDERS.invites,
      to,
      subject: `You've been invited to join ${projectName} on Envault`,
      html,
    });
    if (error) {
      console.error("Resend API failed to send invite email:", error);
    }
  } catch (error) {
    console.error("Failed to send invite email:", error);
  }
}

/**
 * Send access granted notification
 */
export async function sendAccessGrantedEmail(
  to: string,
  projectName: string,
  userId?: string, // Added to check preferences
) {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log("Skipping Access Granted email in DEV (No API Key).");
    return;
  }

  // Check notification preferences if we have a userId
  if (userId) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_access_granted")
      .eq("user_id", userId)
      .single();

    if (prefs && prefs.email_access_granted === false) {
      console.log(`Skipping Access Granted email for ${to} (User opted out)`);
      return;
    }
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

    const { error } = await resend.emails.send({
      from: SENDERS.notifications,
      to,
      subject: `Access Granted: ${projectName}`,
      html,
    });
    if (error) {
      console.error("Resend API failed to send access granted email:", error);
    }
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

// ============================================
// SECURITY ALERT EMAILS
// ============================================

/**
 * Send a security alert email (password change, 2FA, unknown login, encryption failure)
 * From: security@envault.tech
 */
export async function sendSecurityAlertEmail(
  to: string,
  title: string,
  message: string,
  userId?: string,
  actionUrl?: string,
) {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log(`Skipping Security Alert email in DEV: ${title}`);
    return;
  }

  if (userId) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_security_alerts")
      .eq("user_id", userId)
      .single();

    if (prefs && prefs.email_security_alerts === false) {
      console.log(`Skipping Security Alert email for ${to} (User opted out)`);
      return;
    }
  }

  try {
    const html = getEmailHtml({
      heading: title,
      content: `<p>${message}</p><p>If this wasn't you, please secure your account immediately.</p>`,
      action: actionUrl
        ? { text: "Review Security Settings", url: `${APP_URL}${actionUrl}` }
        : { text: "Go to Settings", url: `${APP_URL}/settings` },
      footerText:
        "If you recognise this activity, you can safely ignore this email.",
      logoUrl: LOGO_URL,
    });

    const { error } = await resend.emails.send({
      from: SENDERS.security,
      to,
      subject: `Security Alert: ${title} — Envault`,
      html,
    });
    if (error) {
      console.error("Resend API failed to send security alert email:", error);
    }
  } catch (error) {
    console.error("Failed to send security alert email:", error);
  }
}

// ============================================
// PROJECT & SECRET ACTIVITY EMAILS
// ============================================

/**
 * Send a project activity email (secret/project changes, member events)
 * From: activity@envault.tech
 */
export async function sendProjectActivityEmail(
  to: string,
  projectName: string,
  title: string,
  message: string,
  projectId: string,
  userId?: string,
) {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log(`Skipping Project Activity email in DEV: ${title}`);
    return;
  }

  if (userId) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_project_activity")
      .eq("user_id", userId)
      .single();

    if (prefs && prefs.email_project_activity === false) {
      console.log(`Skipping Project Activity email for ${to} (User opted out)`);
      return;
    }
  }

  try {
    const html = getEmailHtml({
      heading: title,
      content: `<p>${message}</p>`,
      action: {
        text: `View ${projectName}`,
        url: `${APP_URL}/project/${projectId}`,
      },
      logoUrl: LOGO_URL,
    });

    const { error } = await resend.emails.send({
      from: SENDERS.activity,
      to,
      subject: `${title} — ${projectName} on Envault`,
      html,
    });
    if (error) {
      console.error("Resend API failed to send project activity email:", error);
    }
  } catch (error) {
    console.error("Failed to send project activity email:", error);
  }
}

// ============================================
// CLI ACTIVITY EMAILS
// ============================================

/**
 * Send a CLI activity email (secrets pulled or pushed)
 * From: cli@envault.tech
 */
export async function sendCliActivityEmail(
  to: string,
  projectName: string,
  action: "pulled" | "pushed",
  secretCount: number,
  deviceName: string,
  projectId: string,
  userId?: string,
) {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log(`Skipping CLI Activity email in DEV (${action})`);
    return;
  }

  if (userId) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_cli_activity")
      .eq("user_id", userId)
      .single();

    if (prefs && prefs.email_cli_activity === false) {
      console.log(`Skipping CLI Activity email for ${to} (User opted out)`);
      return;
    }
  }

  const title =
    action === "pulled"
      ? `Secrets Pulled from ${projectName}`
      : `Secrets Pushed to ${projectName}`;

  const description =
    action === "pulled"
      ? `<strong>${secretCount}</strong> secret${secretCount !== 1 ? "s" : ""} were pulled from <strong>${projectName}</strong> via the CLI on <strong>${deviceName}</strong>.`
      : `<strong>${secretCount}</strong> secret${secretCount !== 1 ? "s" : ""} were pushed to <strong>${projectName}</strong> via the CLI from <strong>${deviceName}</strong>.`;

  try {
    const html = getEmailHtml({
      heading: title,
      content: `<p>${description}</p><p>If this wasn't you, revoke CLI access from your settings.</p>`,
      action: {
        text: `View ${projectName}`,
        url: `${APP_URL}/project/${projectId}`,
      },
      footerText:
        "You're receiving this because CLI activity notifications are enabled.",
      logoUrl: LOGO_URL,
    });

    const { error } = await resend.emails.send({
      from: SENDERS.cli,
      to,
      subject: `CLI ${action === "pulled" ? "Pull" : "Push"}: ${projectName} — Envault`,
      html,
    });
    if (error) {
      console.error("Resend API failed to send CLI activity email:", error);
    }
  } catch (error) {
    console.error("Failed to send CLI activity email:", error);
  }
}

// ============================================
// SYSTEM UPDATE EMAILS
// ============================================

/**
 * Send a system update/maintenance email
 * From: system@envault.tech
 */
export async function sendSystemUpdateEmail(
  to: string,
  title: string,
  message: string,
  userId?: string,
) {
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log(`Skipping System Update email in DEV: ${title}`);
    return;
  }

  if (userId) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_system_updates")
      .eq("user_id", userId)
      .single();

    if (prefs && prefs.email_system_updates === false) {
      console.log(`Skipping System Update email for ${to} (User opted out)`);
      return;
    }
  }

  try {
    const html = getEmailHtml({
      heading: title,
      content: `<p>${message}</p>`,
      action: {
        text: "View Status Page",
        url: `${APP_URL}/status`,
      },
      footerText:
        "You're receiving this because system update notifications are enabled.",
      logoUrl: LOGO_URL,
    });

    await resend.emails.send({
      from: SENDERS.system,
      to,
      subject: `${title} — Envault`,
      html,
    });
  } catch (error) {
    console.error("Failed to send system update email:", error);
  }
}
