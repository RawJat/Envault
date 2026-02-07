import { Resend } from 'resend'
import { getEmailHtml } from './email-html'

const resend = new Resend(process.env.RESEND_API_KEY)

// Helper to determine sender email
const SENDER_VAR = process.env.EMAIL_SENDER || 'onboarding@resend.dev'
const SENDER = SENDER_VAR.includes('<') ? SENDER_VAR : `Envault <${SENDER_VAR}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://envault.tech'
const LOGO_URL = `https://www.envault.tech/logo-bimi.svg`

/**
 * Send a test email to verify Resend configuration
 */
export async function sendTestEmail(to: string) {
  try {
    const html = getEmailHtml({
      heading: 'Test Email',
      content: `
        <p>This is a test email to verify your Resend configuration is working correctly.</p>
        <p>If you're seeing this, your email setup is working! 🎉</p>
      `,
      logoUrl: LOGO_URL
    })

    const result = await resend.emails.send({
      from: SENDER,
      to,
      subject: 'Envault - Test Email',
      html
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('Failed to send test email:', error)
    return { success: false, error }
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
  to: string,              // Owner's email
  requesterEmail: string,  // Who requested access
  projectName: string,
  requestId: string
) {
  if (process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY) {
    console.log('Skipping Access Request email in DEV (No API Key).')
    return
  }

  try {
    const html = getEmailHtml({
      heading: 'New Access Request',
      content: `
        <p><strong>${requesterEmail}</strong> has requested access to your project <strong>${projectName}</strong>.</p>
        <p>Review and approve or reject this request from your dashboard.</p>
      `,
      action: {
        text: 'Review Request',
        url: `${APP_URL}/approve/${requestId}`
      },
      logoUrl: LOGO_URL
    })

    await resend.emails.send({
      from: SENDER,
      to,
      subject: `Access Request: ${projectName}`,
      html
    })
  } catch (error) {
    console.error('Failed to send access request email:', error)
  }
}

/**
 * Send project invitation email
 */
export async function sendInviteEmail(to: string, projectName: string, token: string) {
  if (process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY) {
    console.warn('Skipping email in DEV (No API Key). Invite Link:', `${APP_URL}/join/${token}`)
    return
  }

  try {
    const html = getEmailHtml({
      heading: `Join ${projectName}`,
      content: `
        <p>You have been invited to collaborate on the project <strong>${projectName}</strong>.</p>
        <p>Click the button below to accept the invitation and request access.</p>
      `,
      action: {
        text: 'Accept Invitation',
        url: `${APP_URL}/join/${token}`
      },
      footerText: "If you didn't expect this invitation, you can ignore this email.",
      logoUrl: LOGO_URL
    })

    await resend.emails.send({
      from: SENDER,
      to,
      subject: `You've been invited to join ${projectName} on Envault`,
      html
    })
  } catch (error) {
    console.error('Failed to send invite email:', error)
  }
}

/**
 * Send access granted notification
 */
export async function sendAccessGrantedEmail(to: string, projectName: string) {
  if (process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY) {
    console.log('Skipping Access Granted email in DEV (No API Key).')
    return
  }

  try {
    const html = getEmailHtml({
      heading: 'Access Granted',
      content: `<p>Your request to access <strong>${projectName}</strong> has been approved.</p>`,
      action: {
        text: 'Go to Dashboard',
        url: `${APP_URL}/dashboard`
      },
      logoUrl: LOGO_URL
    })

    await resend.emails.send({
      from: SENDER,
      to,
      subject: `Access Granted: ${projectName}`,
      html
    })
  } catch (error) {
    console.error('Failed to send access granted email:', error)
  }
}
