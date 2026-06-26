const PRIMARY = '#21d5ed';
const PRIMARY_LIGHT = '#5ae0f2';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function resetPasswordTemplate(
  resetUrl: string,
  expiryMinutes: number = 60,
): string {
  const safeUrl = escapeHtml(resetUrl);

  return `
<!-- Accent bar -->
<div style="height:4px;background:linear-gradient(90deg,${PRIMARY} 0%,${PRIMARY_LIGHT} 100%)"></div>

<div style="padding:40px 40px 48px">

<!-- Lock icon -->
<div style="text-align:center;margin-bottom:24px">
<table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center">
<tr><td style="width:56px;height:56px;border-radius:14px;background-color:#0f2f33;text-align:center;vertical-align:middle">
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${PRIMARY}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
</td></tr>
</table>
</div>

<!-- Heading -->
<h1 class="email-heading" style="margin:0 0 12px;font-size:24px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.3px;line-height:1.3">Reset your password</h1>

<!-- Body text -->
<p class="email-text" style="margin:0 0 32px;font-size:16px;color:#9ca3af;text-align:center;line-height:1.6">We received a request to reset the password for your CyberXscore account. Click the button below to choose a new password.</p>

<!-- CTA Button -->
<div style="text-align:center;margin-bottom:32px">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeUrl}" style="height:48px;v-text-anchor:middle;width:220px" arcsize="21%" fillcolor="${PRIMARY}"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600">Reset Password</center></v:roundrect><![endif]-->
<!--[if !mso]><!-->
<a href="${safeUrl}" style="display:inline-block;padding:14px 36px;background-color:${PRIMARY};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.1px;mso-padding-alt:0;text-align:center">Reset Password</a>
<!--<![endif]-->
</div>

<!-- Divider -->
<div class="email-divider" style="border-top:1px solid #2a2a2a;margin:32px 0"></div>

<!-- Security notice -->
<div class="email-notice-bg" style="background-color:#111111;border-radius:10px;padding:20px;margin-bottom:24px">
<p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px">Security notice</p>
<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%">
<tr><td style="padding:3px 0;font-size:14px;color:#6b7280;line-height:1.7;vertical-align:top">&bull;&nbsp; This link expires in ${expiryMinutes} minutes</td></tr>
<tr><td style="padding:3px 0;font-size:14px;color:#6b7280;line-height:1.7;vertical-align:top">&bull;&nbsp; Can only be used once</td></tr>
<tr><td style="padding:3px 0;font-size:14px;color:#6b7280;line-height:1.7;vertical-align:top">&bull;&nbsp; If you didn&rsquo;t request this, ignore this email</td></tr>
<tr><td style="padding:3px 0;font-size:14px;color:#6b7280;line-height:1.7;vertical-align:top">&bull;&nbsp; Your password won&rsquo;t change until you click the link</td></tr>
</table>
</div>

<!-- URL fallback -->
<p style="margin:0;font-size:12px;color:#4b5563;text-align:center;line-height:1.6">
Button not working? Copy this link:<br>
<a href="${safeUrl}" style="color:${PRIMARY};word-break:break-all;font-size:11px;text-decoration:none">${safeUrl}</a>
</p>

</div>`;
}

export function resetPasswordText(resetUrl: string): string {
  return `Reset your CyberXscore password
================================

We received a request to reset the password for your CyberXscore account.

Click the link below to choose a new password:
${resetUrl}

Security notice:
- This link expires in 60 minutes
- Can only be used once
- If you didn't request this, ignore this email
- Your password won't change until you click the link

---
CyberXscore — Cybersecurity Assessment for SMBs
© 2026 BITUP TECHNOLOGY
https://mvp.cyberxscore.com`;
}
