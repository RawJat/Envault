
interface EmailAction {
    text: string;
    url: string;
}

interface EmailProps {
    previewText?: string;
    heading: string;
    content: string; // HTML string
    action?: EmailAction;
    footerText?: string; // Additional text below the button or main content
    logoUrl?: string;
}

/**
 * Generates a responsive, styled HTML email string.
 */
export function getEmailHtml({ previewText, heading, content, action, footerText, logoUrl }: EmailProps): string {
    // Brand Colors based on Envault's theme
    const primaryColor = '#18181b'; // Zinc-900
    const backgroundColor = '#f4f4f5'; // Zinc-100
    const cardColor = '#ffffff';
    const textColor = '#18181b';
    const mutedColor = '#52525b'; // Zinc-600
    const borderColor = '#e4e4e7'; // Zinc-200

    // Pre-header/Preview Text hidden element style
    const hiddenStyle = 'display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${heading}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
    
    /* Reset */
    body { 
      margin: 0; 
      padding: 0; 
      background-color: ${backgroundColor}; 
      font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
      -webkit-font-smoothing: antialiased; 
      color: ${textColor};
    }
    
    table { border-spacing: 0; width: 100%; }
    td { padding: 0; }
    img { border: 0; }
    
    /* Layout */
    .wrapper { 
      width: 100%; 
      table-layout: fixed; 
      background-color: ${backgroundColor}; 
      padding: 60px 0; 
    }
    
    .main { 
      background-color: ${cardColor}; 
      margin: 0 auto; 
      width: 96%; 
      max-width: 540px; 
      border-radius: 16px; 
      overflow: hidden; 
      box-shadow: 0 4px 20px -1px rgba(0, 0, 0, 0.08);
      border: 1px solid ${borderColor};
    }
    
    /* Elements */
    .header { 
      padding: 40px 48px 32px; 
      text-align: center; 
    }
    
    .logo { 
      font-size: 26px; 
      font-weight: 700; 
      color: ${textColor}; 
      text-decoration: none; 
      letter-spacing: -0.75px; 
      display: inline-block;
    }
    
    .body { 
      padding: 0 48px 48px 48px; 
    }
    
    .heading { 
      font-size: 24px; 
      font-weight: 600; 
      margin: 0 0 20px; 
      color: ${textColor}; 
      line-height: 1.3; 
      letter-spacing: -0.5px; 
      text-align: left;
    }
    
    .text { 
      font-size: 16px; 
      line-height: 1.6; 
      color: ${mutedColor}; 
      margin: 0 0 24px; 
      text-align: left;
    }
    
    .btn-container {
      margin: 32px 0;
      text-align: left;
    }
    
    .btn { 
      display: inline-block; 
      background-color: ${primaryColor}; 
      color: #ffffff !important; 
      font-size: 15px; 
      font-weight: 500; 
      text-decoration: none; 
      padding: 14px 28px; 
      border-radius: 10px; 
      transition: opacity 0.2s;
      text-align: center;
    }
    
    .btn:hover { opacity: 0.9; }
    
    .footer { 
      padding: 32px 48px; 
      text-align: center; 
      background-color: #fafafa; 
      border-top: 1px solid ${borderColor}; 
    }
    
    .footer-text { 
      font-size: 13px; 
      color: #a1a1aa; 
      line-height: 1.6; 
      margin: 0; 
    }
    
    .footer-link {
        color: #a1a1aa;
        text-decoration: underline;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .wrapper { padding: 20px 0; }
      .header { padding: 32px 24px 24px; }
      .body { padding: 0 24px 32px; }
      .footer { padding: 24px; }
      .heading { font-size: 22px; }
      .text { font-size: 15px; }
      .btn { width: 100%; box-sizing: border-box; }
    }
  </style>
</head>
<body>
  ${previewText ? `<div style="${hiddenStyle}">${previewText}</div>` : ''}
  <div class="wrapper">
    <table role="presentation">
      <tr>
        <td align="center">
          <div class="main">
            <div class="header">
              <a href="https://envault.tech" class="logo">
                ${logoUrl ? `<img src="${logoUrl}" width="26" height="26" alt="" style="vertical-align: middle; margin-right: 8px;" />` : ''}
                <span style="vertical-align: middle;">Envault</span>
              </a>
            </div>
            <div class="body">
              <h1 class="heading">${heading}</h1>
              <div class="text">${content}</div>
              ${action ? `<div class="btn-container"><a href="${action.url}" class="btn">${action.text}</a></div>` : ''}
              ${footerText ? `<div class="text" style="font-size: 14px; margin-top: 24px; color: #71717a;">${footerText}</div>` : ''}
            </div>
            <div class="footer">
              <p class="footer-text">
                &copy; ${new Date().getFullYear()} Envault. All rights reserved.<br>
                Secure Environment Variables Management
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `.trim();
}
