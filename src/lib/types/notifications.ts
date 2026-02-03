// Notification types and interfaces
export interface Notification {
    id: string
    user_id: string
    type: NotificationType
    title: string
    message: string
    icon: string
    variant: NotificationVariant
    metadata: Record<string, any>
    action_url?: string
    action_type?: string
    is_read: boolean
    is_archived: boolean
    created_at: string
    read_at?: string
    expires_at?: string
}

export type NotificationType =
    // Access & Collaboration
    | 'access_request_received'
    | 'access_request_approved'
    | 'access_request_denied'
    | 'invitation_sent'
    | 'invitation_accepted'
    | 'role_upgraded'
    | 'role_downgraded'
    | 'member_removed'
    | 'member_joined'
    | 'member_left'
    // Project & Secret Activity
    | 'secret_added'
    | 'secret_updated'
    | 'secret_deleted'
    | 'bulk_operation'
    | 'project_created'
    | 'project_renamed'
    | 'project_deleted'
    | 'settings_changed'
    // CLI Activity
    | 'secrets_pulled'
    | 'secrets_pushed'
    | 'new_device_access'
    | 'new_location'
    // System & Errors
    | 'encryption_failed'
    | 'rate_limit_warning'
    | 'security_alert'
    | 'email_failed'
    | 'system_update'
    | 'maintenance'
    | 'security_advisory'
    // Account Events
    | 'password_changed'
    | 'email_changed'
    | 'unknown_login'
    | '2fa_enabled'
    | '2fa_disabled'

export type NotificationVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

export interface NotificationPreferences {
    user_id: string
    // Email notifications
    email_access_requests: boolean
    email_access_granted: boolean
    email_errors: boolean
    email_activity: boolean
    // In-app notifications
    app_access_requests: boolean
    app_access_granted: boolean
    app_errors: boolean
    app_activity: boolean
    // Digest settings
    digest_frequency: 'none' | 'daily' | 'weekly'
    updated_at: string
}

// Icon mapping for notification types
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
    // Access & Collaboration
    access_request_received: 'UserPlus',
    access_request_approved: 'CheckCircle2',
    access_request_denied: 'XCircle',
    invitation_sent: 'Mail',
    invitation_accepted: 'UserCheck',
    role_upgraded: 'TrendingUp',
    role_downgraded: 'TrendingDown',
    member_removed: 'UserMinus',
    member_joined: 'Users',
    member_left: 'UserX',
    // Project & Secret Activity
    secret_added: 'Plus',
    secret_updated: 'Edit3',
    secret_deleted: 'Trash2',
    bulk_operation: 'PackagePlus',
    project_created: 'FolderPlus',
    project_renamed: 'FileEdit',
    project_deleted: 'FolderX',
    settings_changed: 'Settings',
    // CLI Activity
    secrets_pulled: 'Download',
    secrets_pushed: 'Upload',
    new_device_access: 'Smartphone',
    new_location: 'MapPin',
    // System & Errors
    encryption_failed: 'ShieldAlert',
    rate_limit_warning: 'AlertTriangle',
    security_alert: 'ShieldX',
    email_failed: 'MailX',
    system_update: 'Sparkles',
    maintenance: 'Wrench',
    security_advisory: 'Shield',
    // Account Events
    password_changed: 'KeyRound',
    email_changed: 'AtSign',
    unknown_login: 'AlertOctagon',
    '2fa_enabled': 'ShieldCheck',
    '2fa_disabled': 'ShieldOff',
}
