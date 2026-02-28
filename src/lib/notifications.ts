import {
  Notification,
  NotificationType,
  NotificationVariant,
  NOTIFICATION_ICONS,
} from "@/lib/types/notifications";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  variant?: NotificationVariant;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  actionType?: string;
}

/**
 * Check if user wants to receive this type of notification
 */
async function shouldCreateNotification(
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  // If no preferences row exists, allow all
  if (!prefs) return true;

  switch (type) {
    // Access Requests
    case "access_request_received":
      return prefs.app_access_requests !== false;

    // Access Granted / Denied / Role changes / Invitations
    case "access_request_approved":
    case "access_request_denied":
    case "invitation_sent":
    case "invitation_accepted":
    case "role_upgraded":
    case "role_downgraded":
    case "member_removed":
      return prefs.app_access_granted !== false;

    // Device Activity
    case "new_device_access":
    case "new_location":
    case "unknown_login":
      return prefs.app_device_activity !== false;

    // Security Alerts
    case "security_alert":
    case "security_advisory":
    case "password_changed":
    case "email_changed":
    case "2fa_enabled":
    case "2fa_disabled":
    case "encryption_failed":
      return prefs.app_security_alerts !== false;

    // Project & Secret Activity
    case "secret_added":
    case "secret_updated":
    case "secret_deleted":
    case "bulk_operation":
    case "project_created":
    case "project_renamed":
    case "project_deleted":
    case "settings_changed":
    case "member_joined":
    case "member_left":
      return prefs.app_project_activity !== false;

    // CLI Activity
    case "secrets_pulled":
    case "secrets_pushed":
      return prefs.app_cli_activity !== false;

    // System & Maintenance
    case "system_update":
    case "maintenance":
    case "rate_limit_warning":
    case "email_failed":
    case "incident_created":
      return prefs.app_system_updates !== false;

    default:
      return true;
  }
}

/**
 * Create a notification for a user
 * This should be called from server-side code (API routes, server actions)
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  variant = "default",
  metadata = {},
  actionUrl,
  actionType,
}: CreateNotificationParams): Promise<{
  data: Notification | null;
  error: unknown;
}> {
  // Check if user wants this notification
  const shouldCreate = await shouldCreateNotification(userId, type);
  if (!shouldCreate) {
    return { data: null, error: null }; // Silently skip
  }

  // Use admin client to bypass RLS for system-generated notifications
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Get the icon for this notification type
  const icon = NOTIFICATION_ICONS[type] || "Bell";

  const { data, error } = await admin
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      title,
      message,
      icon,
      variant,
      metadata,
      action_url: actionUrl,
      action_type: actionType,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create notification:", error);
    return { data: null, error };
  }

  // Atomically increment cached unread count
  try {
    const { cacheIncr, cacheDel, CacheKeys, CACHE_TTL } =
      await import("./cache");
    await cacheIncr(CacheKeys.userUnreadCount(userId), CACHE_TTL.UNREAD_COUNT);

    // Invalidate list cache so next fetch gets this new notification
    await cacheDel(CacheKeys.userNotificationsList(userId));
  } catch (cacheError) {
    // Don't fail notification creation if cache update fails
    console.warn("Failed to update unread count cache:", cacheError);
  }

  return { data: data as Notification, error: null };
}

/**
 * Create an access request notification
 */
export async function createAccessRequestNotification(
  ownerId: string,
  requesterEmail: string,
  projectName: string,
  projectId: string,
  requesterId: string,
  requestId: string,
) {
  return createNotification({
    userId: ownerId,
    type: "access_request_received",
    title: "New Access Request",
    message: `${requesterEmail} wants access to ${projectName}`,
    variant: "info",
    metadata: {
      projectId,
      requesterId,
      requesterEmail,
      requestId,
    },
    actionUrl: `/approve/${requestId}`,
    actionType: "approve_request",
  });
}

/**
 * Create an access granted notification
 */
export async function createAccessGrantedNotification(
  userId: string,
  projectName: string,
  projectId: string,
  role: string,
) {
  return createNotification({
    userId,
    type: "access_request_approved",
    title: "Access Granted",
    message: `You now have ${role} access to ${projectName}`,
    variant: "success",
    metadata: {
      projectId,
      role,
    },
    actionUrl: `/dashboard`,
    actionType: "view_project",
  });
}

/**
 * Create an access denied notification
 */
export async function createAccessDeniedNotification(
  userId: string,
  projectName: string,
  projectId: string,
) {
  return createNotification({
    userId,
    type: "access_request_denied",
    title: "Access Request Denied",
    message: `Your request to access ${projectName} was denied`,
    variant: "error",
    metadata: {
      projectId,
    },
  });
}

// ============================================
// SECRET CHANGE NOTIFICATIONS
// ============================================

/**
 * Create a secret added notification
 */
export async function createSecretAddedNotification(
  userId: string,
  secretKey: string,
  projectName: string,
  projectId: string,
  addedBy: string,
) {
  return createNotification({
    userId,
    type: "secret_added",
    title: "Secret Added",
    message: `${addedBy} added "${secretKey}" to ${projectName}`,
    variant: "info",
    metadata: {
      projectId,
      secretKey,
      addedBy,
    },
    actionUrl: `/dashboard/${projectId}`,
    actionType: "view_project",
  });
}

/**
 * Create a secret updated notification
 */
export async function createSecretUpdatedNotification(
  userId: string,
  secretKey: string,
  projectName: string,
  projectId: string,
  updatedBy: string,
) {
  return createNotification({
    userId,
    type: "secret_updated",
    title: "Secret Updated",
    message: `${updatedBy} updated "${secretKey}" in ${projectName}`,
    variant: "info",
    metadata: {
      projectId,
      secretKey,
      updatedBy,
    },
    actionUrl: `/dashboard/${projectId}`,
    actionType: "view_project",
  });
}

/**
 * Create a secret deleted notification
 */
export async function createSecretDeletedNotification(
  userId: string,
  secretKey: string,
  projectName: string,
  projectId: string,
  deletedBy: string,
) {
  return createNotification({
    userId,
    type: "secret_deleted",
    title: "Secret Deleted",
    message: `${deletedBy} deleted "${secretKey}" from ${projectName}`,
    variant: "warning",
    metadata: {
      projectId,
      secretKey,
      deletedBy,
    },
    actionUrl: `/dashboard/${projectId}`,
    actionType: "view_project",
  });
}

/**
 * Create a bulk operation notification
 */
export async function createBulkOperationNotification(
  userId: string,
  operation: string,
  count: number,
  projectName: string,
  projectId: string,
  performedBy: string,
) {
  return createNotification({
    userId,
    type: "bulk_operation",
    title: "Bulk Operation",
    message: `${performedBy} ${operation} ${count} secrets in ${projectName}`,
    variant: "info",
    metadata: {
      projectId,
      operation,
      count,
      performedBy,
    },
    actionUrl: `/dashboard/${projectId}`,
    actionType: "view_project",
  });
}

// ============================================
// PROJECT EVENT NOTIFICATIONS
// ============================================

/**
 * Create a project created notification
 */
export async function createProjectCreatedNotification(
  userId: string,
  projectName: string,
  projectId: string,
  createdBy: string,
) {
  return createNotification({
    userId,
    type: "project_created",
    title: "Project Created",
    message: `${createdBy} created project "${projectName}"`,
    variant: "success",
    metadata: {
      projectId,
      createdBy,
    },
    actionUrl: `/dashboard/${projectId}`,
    actionType: "view_project",
  });
}

/**
 * Create a project renamed notification
 */
export async function createProjectRenamedNotification(
  userId: string,
  oldName: string,
  newName: string,
  projectId: string,
  renamedBy: string,
) {
  return createNotification({
    userId,
    type: "project_renamed",
    title: "Project Renamed",
    message: `${renamedBy} renamed "${oldName}" to "${newName}"`,
    variant: "info",
    metadata: {
      projectId,
      oldName,
      newName,
      renamedBy,
    },
    actionUrl: `/dashboard/${projectId}`,
    actionType: "view_project",
  });
}

/**
 * Create a project deleted notification
 */
export async function createProjectDeletedNotification(
  userId: string,
  projectName: string,
  deletedBy: string,
) {
  return createNotification({
    userId,
    type: "project_deleted",
    title: "Project Deleted",
    message: `${deletedBy} deleted project "${projectName}"`,
    variant: "warning",
    metadata: {
      projectName,
      deletedBy,
    },
  });
}

/**
 * Create a member joined notification
 */
export async function createMemberJoinedNotification(
  userId: string,
  memberEmail: string,
  projectName: string,
  projectId: string,
  role: string,
) {
  return createNotification({
    userId,
    type: "member_joined",
    title: "New Team Member",
    message: `${memberEmail} joined ${projectName} as ${role}`,
    variant: "info",
    metadata: {
      projectId,
      memberEmail,
      role,
    },
    actionUrl: `/dashboard/${projectId}`,
    actionType: "view_project",
  });
}

/**
 * Create a member left notification
 */
export async function createMemberLeftNotification(
  userId: string,
  memberEmail: string,
  projectName: string,
  projectId: string,
) {
  return createNotification({
    userId,
    type: "member_left",
    title: "Team Member Left",
    message: `${memberEmail} left ${projectName}`,
    variant: "info",
    metadata: {
      projectId,
      memberEmail,
    },
    actionUrl: `/dashboard/${projectId}`,
    actionType: "view_project",
  });
}

/**
 * Create a role changed notification
 */
export async function createRoleChangedNotification(
  userId: string,
  projectName: string,
  projectId: string,
  oldRole: string,
  newRole: string,
  changedBy: string,
) {
  const isUpgrade =
    ["viewer", "editor", "owner"].indexOf(newRole) >
    ["viewer", "editor", "owner"].indexOf(oldRole);

  return createNotification({
    userId,
    type: isUpgrade ? "role_upgraded" : "role_downgraded",
    title: isUpgrade ? "Role Upgraded" : "Role Changed",
    message: `${changedBy} changed your role in ${projectName} from ${oldRole} to ${newRole}`,
    variant: isUpgrade ? "success" : "warning",
    metadata: {
      projectId,
      oldRole,
      newRole,
      changedBy,
    },
    actionUrl: `/dashboard/${projectId}`,
    actionType: "view_project",
  });
}

// ============================================
// CLI ACTIVITY NOTIFICATIONS
// ============================================

/**
 * Create a secrets pulled notification
 */
export async function createSecretsPulledNotification(
  userId: string,
  projectName: string,
  projectId: string,
  deviceName: string,
  count: number,
) {
  return createNotification({
    userId,
    type: "secrets_pulled",
    title: "Secrets Pulled via CLI",
    message: `${count} secret${count !== 1 ? "s" : ""} pulled from ${projectName} on ${deviceName}`,
    variant: "info",
    metadata: { projectId, deviceName, count },
    actionUrl: `/project/${projectId}`,
    actionType: "view_project",
  });
}

/**
 * Create a secrets pushed notification
 */
export async function createSecretsPushedNotification(
  userId: string,
  projectName: string,
  projectId: string,
  deviceName: string,
  count: number,
) {
  return createNotification({
    userId,
    type: "secrets_pushed",
    title: "Secrets Pushed via CLI",
    message: `${count} secret${count !== 1 ? "s" : ""} pushed to ${projectName} from ${deviceName}`,
    variant: "info",
    metadata: { projectId, deviceName, count },
    actionUrl: `/project/${projectId}`,
    actionType: "view_project",
  });
}

// ============================================
// DEVICE & SECURITY NOTIFICATIONS
// ============================================

/**
 * Create a new device access notification
 */
export async function createNewDeviceNotification(
  userId: string,
  deviceName: string,
  deviceInfo?: Record<string, unknown>,
) {
  return createNotification({
    userId,
    type: "new_device_access",
    title: "New Device Authenticated",
    message: `CLI access granted to ${deviceName}`,
    variant: "info",
    metadata: { deviceName, device_info: deviceInfo ?? {} },
  });
}

/**
 * Create an unknown login notification
 */
export async function createUnknownLoginNotification(
  userId: string,
  location: string,
  ipAddress: string,
) {
  return createNotification({
    userId,
    type: "unknown_login",
    title: "Sign-In from Unknown Location",
    message: `Your account was accessed from ${location} (${ipAddress})`,
    variant: "warning",
    metadata: { location, ipAddress },
    actionUrl: "/settings",
    actionType: "view_settings",
  });
}

/**
 * Create a security alert notification
 */
export async function createSecurityAlertNotification(
  userId: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  return createNotification({
    userId,
    type: "security_alert",
    title,
    message,
    variant: "error",
    metadata: metadata ?? {},
    actionUrl: "/settings",
    actionType: "view_settings",
  });
}

// ============================================
// ACCOUNT EVENT NOTIFICATIONS
// ============================================

/**
 * Create a password changed notification
 */
export async function createPasswordChangedNotification(userId: string) {
  return createNotification({
    userId,
    type: "password_changed",
    title: "Password Changed",
    message:
      "Your account password was changed. If this wasn't you, secure your account immediately.",
    variant: "warning",
    metadata: {},
    actionUrl: "/settings",
    actionType: "view_settings",
  });
}

/**
 * Create an email changed notification
 */
export async function createEmailChangedNotification(
  userId: string,
  newEmail: string,
) {
  return createNotification({
    userId,
    type: "email_changed",
    title: "Email Address Updated",
    message: `Your account email was changed to ${newEmail}`,
    variant: "info",
    metadata: { newEmail },
    actionUrl: "/settings",
    actionType: "view_settings",
  });
}

/**
 * Create a 2FA enabled/disabled notification
 */
export async function create2FANotification(userId: string, enabled: boolean) {
  return createNotification({
    userId,
    type: enabled ? "2fa_enabled" : "2fa_disabled",
    title: enabled
      ? "Two-Factor Authentication Enabled"
      : "Two-Factor Authentication Disabled",
    message: enabled
      ? "Your account is now protected with two-factor authentication."
      : "Two-factor authentication has been disabled on your account.",
    variant: enabled ? "success" : "warning",
    metadata: {},
    actionUrl: "/settings",
    actionType: "view_settings",
  });
}

// ============================================
// SYSTEM NOTIFICATIONS
// ============================================

/**
 * Create a system update notification
 */
export async function createSystemUpdateNotification(
  userId: string,
  version: string,
  summary: string,
) {
  return createNotification({
    userId,
    type: "system_update",
    title: `Envault Updated to ${version}`,
    message: summary,
    variant: "info",
    metadata: { version },
  });
}

/**
 * Create a maintenance notification
 */
export async function createMaintenanceNotification(
  userId: string,
  scheduledAt: string,
  durationMinutes: number,
) {
  return createNotification({
    userId,
    type: "maintenance",
    title: "Scheduled Maintenance",
    message: `Envault will undergo maintenance on ${scheduledAt} for approximately ${durationMinutes} minutes.`,
    variant: "default",
    metadata: { scheduledAt, durationMinutes },
  });
}

/**
 * Create a member removed notification (for the removed user)
 */
export async function createMemberRemovedNotification(
  userId: string,
  projectName: string,
  removedBy: string,
) {
  return createNotification({
    userId,
    type: "member_removed",
    title: "Removed from Project",
    message: `${removedBy} removed you from ${projectName}`,
    variant: "warning",
    metadata: { projectName, removedBy },
    actionUrl: "/dashboard",
    actionType: "view_dashboard",
  });
}

/**
 * Create an invitation accepted notification (for the project owner)
 */
export async function createInvitationAcceptedNotification(
  ownerId: string,
  accepterEmail: string,
  projectName: string,
  projectId: string,
) {
  return createNotification({
    userId: ownerId,
    type: "invitation_accepted",
    title: "Invitation Accepted",
    message: `${accepterEmail} accepted the invitation to join ${projectName}`,
    variant: "success",
    metadata: { projectId, accepterEmail },
    actionUrl: `/project/${projectId}`,
    actionType: "view_project",
  });
}
