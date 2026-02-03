import { createClient } from '@/lib/supabase/server'
import { Notification, NotificationType, NotificationVariant, NOTIFICATION_ICONS } from '@/lib/types/notifications'

interface CreateNotificationParams {
    userId: string
    type: NotificationType
    title: string
    message: string
    variant?: NotificationVariant
    metadata?: Record<string, any>
    actionUrl?: string
    actionType?: string
}

/**
 * Check if user wants to receive this type of notification
 */
async function shouldCreateNotification(
    userId: string,
    type: NotificationType
): Promise<boolean> {
    const supabase = await createClient()

    // Get user preferences
    const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

    // If no preferences set, allow all notifications
    if (!prefs) return true

    // Map notification types to preference fields
    const accessTypes: NotificationType[] = [
        'access_request_received',
        'access_request_approved',
        'access_request_denied',
        'invitation_sent',
        'invitation_accepted'
    ]

    const activityTypes: NotificationType[] = [
        'secret_added',
        'secret_updated',
        'secret_deleted',
        'bulk_operation',
        'project_created',
        'project_renamed',
        'project_deleted',
        'settings_changed',
        'secrets_pulled',
        'secrets_pushed',
        'member_joined',
        'member_left',
        'role_upgraded',
        'role_downgraded',
        'member_removed'
    ]

    const errorTypes: NotificationType[] = [
        'encryption_failed',
        'rate_limit_warning',
        'security_alert',
        'email_failed',
        'security_advisory',
        'unknown_login'
    ]

    // Check preferences based on type
    if (accessTypes.includes(type)) {
        return prefs.app_access_requests !== false
    } else if (activityTypes.includes(type)) {
        return prefs.app_activity !== false
    } else if (errorTypes.includes(type)) {
        return prefs.app_errors !== false
    }

    // Allow all other types by default
    return true
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
    variant = 'default',
    metadata = {},
    actionUrl,
    actionType
}: CreateNotificationParams): Promise<{ data: Notification | null; error: any }> {
    // Check if user wants this notification
    const shouldCreate = await shouldCreateNotification(userId, type)
    if (!shouldCreate) {
        return { data: null, error: null } // Silently skip
    }

    const supabase = await createClient()

    // Get the icon for this notification type
    const icon = NOTIFICATION_ICONS[type] || 'Bell'

    const { data, error } = await supabase
        .from('notifications')
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
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single()

    if (error) {
        console.error('Failed to create notification:', error)
        return { data: null, error }
    }

    return { data: data as Notification, error: null }
}

/**
 * Create an access request notification
 */
export async function createAccessRequestNotification(
    ownerId: string,
    requesterEmail: string,
    projectName: string,
    projectId: string,
    requesterId: string
) {
    return createNotification({
        userId: ownerId,
        type: 'access_request_received',
        title: 'New Access Request',
        message: `${requesterEmail} wants access to ${projectName}`,
        variant: 'info',
        metadata: {
            projectId,
            requesterId,
            requesterEmail
        },
        actionUrl: '/dashboard?tab=requests',
        actionType: 'approve_request'
    })
}

/**
 * Create an access granted notification
 */
export async function createAccessGrantedNotification(
    userId: string,
    projectName: string,
    projectId: string,
    role: string
) {
    return createNotification({
        userId,
        type: 'access_request_approved',
        title: 'Access Granted',
        message: `You now have ${role} access to ${projectName}`,
        variant: 'success',
        metadata: {
            projectId,
            role
        },
        actionUrl: `/dashboard`,
        actionType: 'view_project'
    })
}

/**
 * Create an access denied notification
 */
export async function createAccessDeniedNotification(
    userId: string,
    projectName: string,
    projectId: string
) {
    return createNotification({
        userId,
        type: 'access_request_denied',
        title: 'Access Request Denied',
        message: `Your request to access ${projectName} was denied`,
        variant: 'error',
        metadata: {
            projectId
        }
    })
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
    addedBy: string
) {
    return createNotification({
        userId,
        type: 'secret_added',
        title: 'Secret Added',
        message: `${addedBy} added "${secretKey}" to ${projectName}`,
        variant: 'info',
        metadata: {
            projectId,
            secretKey,
            addedBy
        },
        actionUrl: `/dashboard/${projectId}`,
        actionType: 'view_project'
    })
}

/**
 * Create a secret updated notification
 */
export async function createSecretUpdatedNotification(
    userId: string,
    secretKey: string,
    projectName: string,
    projectId: string,
    updatedBy: string
) {
    return createNotification({
        userId,
        type: 'secret_updated',
        title: 'Secret Updated',
        message: `${updatedBy} updated "${secretKey}" in ${projectName}`,
        variant: 'info',
        metadata: {
            projectId,
            secretKey,
            updatedBy
        },
        actionUrl: `/dashboard/${projectId}`,
        actionType: 'view_project'
    })
}

/**
 * Create a secret deleted notification
 */
export async function createSecretDeletedNotification(
    userId: string,
    secretKey: string,
    projectName: string,
    projectId: string,
    deletedBy: string
) {
    return createNotification({
        userId,
        type: 'secret_deleted',
        title: 'Secret Deleted',
        message: `${deletedBy} deleted "${secretKey}" from ${projectName}`,
        variant: 'warning',
        metadata: {
            projectId,
            secretKey,
            deletedBy
        },
        actionUrl: `/dashboard/${projectId}`,
        actionType: 'view_project'
    })
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
    performedBy: string
) {
    return createNotification({
        userId,
        type: 'bulk_operation',
        title: 'Bulk Operation',
        message: `${performedBy} ${operation} ${count} secrets in ${projectName}`,
        variant: 'info',
        metadata: {
            projectId,
            operation,
            count,
            performedBy
        },
        actionUrl: `/dashboard/${projectId}`,
        actionType: 'view_project'
    })
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
    createdBy: string
) {
    return createNotification({
        userId,
        type: 'project_created',
        title: 'Project Created',
        message: `${createdBy} created project "${projectName}"`,
        variant: 'success',
        metadata: {
            projectId,
            createdBy
        },
        actionUrl: `/dashboard/${projectId}`,
        actionType: 'view_project'
    })
}

/**
 * Create a project renamed notification
 */
export async function createProjectRenamedNotification(
    userId: string,
    oldName: string,
    newName: string,
    projectId: string,
    renamedBy: string
) {
    return createNotification({
        userId,
        type: 'project_renamed',
        title: 'Project Renamed',
        message: `${renamedBy} renamed "${oldName}" to "${newName}"`,
        variant: 'info',
        metadata: {
            projectId,
            oldName,
            newName,
            renamedBy
        },
        actionUrl: `/dashboard/${projectId}`,
        actionType: 'view_project'
    })
}

/**
 * Create a project deleted notification
 */
export async function createProjectDeletedNotification(
    userId: string,
    projectName: string,
    deletedBy: string
) {
    return createNotification({
        userId,
        type: 'project_deleted',
        title: 'Project Deleted',
        message: `${deletedBy} deleted project "${projectName}"`,
        variant: 'warning',
        metadata: {
            projectName,
            deletedBy
        }
    })
}

/**
 * Create a member joined notification
 */
export async function createMemberJoinedNotification(
    userId: string,
    memberEmail: string,
    projectName: string,
    projectId: string,
    role: string
) {
    return createNotification({
        userId,
        type: 'member_joined',
        title: 'New Team Member',
        message: `${memberEmail} joined ${projectName} as ${role}`,
        variant: 'info',
        metadata: {
            projectId,
            memberEmail,
            role
        },
        actionUrl: `/dashboard/${projectId}`,
        actionType: 'view_project'
    })
}

/**
 * Create a member left notification
 */
export async function createMemberLeftNotification(
    userId: string,
    memberEmail: string,
    projectName: string,
    projectId: string
) {
    return createNotification({
        userId,
        type: 'member_left',
        title: 'Team Member Left',
        message: `${memberEmail} left ${projectName}`,
        variant: 'info',
        metadata: {
            projectId,
            memberEmail
        },
        actionUrl: `/dashboard/${projectId}`,
        actionType: 'view_project'
    })
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
    changedBy: string
) {
    const isUpgrade = ['viewer', 'editor', 'owner'].indexOf(newRole) > ['viewer', 'editor', 'owner'].indexOf(oldRole)

    return createNotification({
        userId,
        type: isUpgrade ? 'role_upgraded' : 'role_downgraded',
        title: isUpgrade ? 'Role Upgraded' : 'Role Changed',
        message: `${changedBy} changed your role in ${projectName} from ${oldRole} to ${newRole}`,
        variant: isUpgrade ? 'success' : 'warning',
        metadata: {
            projectId,
            oldRole,
            newRole,
            changedBy
        },
        actionUrl: `/dashboard/${projectId}`,
        actionType: 'view_project'
    })
}
