const PRIMARY = '#21d5ed';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function baseTemplate(content: string, previewText: string): string {
  const safePreview = escapeHtml(previewText);

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings>
</xml></noscript><![endif]-->
<title>CyberXscore</title>
<style>
@media (prefers-color-scheme: light) {
  .email-body { background-color: #f9fafb !important; }
  .email-card { background-color: #ffffff !important; border-color: #e5e7eb !important; }
  .email-heading { color: #111827 !important; }
  .email-text { color: #374151 !important; }
  .email-muted { color: #6b7280 !important; }
  .email-notice-bg { background-color: #f3f4f6 !important; }
  .email-divider { border-color: #e5e7eb !important; }
}
</style>
</head>
<body class="email-body" style="margin:0;padding:0;background-color:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">

<!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><![endif]-->

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${safePreview}${'&nbsp;&zwnj;'.repeat(30)}</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#0f0f0f" class="email-body">
<tr><td align="center" style="padding:40px 16px">

<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px">

<!-- Logo -->
<tr><td style="padding:0 0 32px 0;text-align:center">
<table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center">
<tr>
<td style="vertical-align:middle;padding-right:10px">
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${PRIMARY}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
</td>
<td style="vertical-align:middle">
<span style="font-size:26px;font-weight:800;color:${PRIMARY};letter-spacing:-0.5px;text-decoration:none">CyberXscore</span>
</td>
</tr>
</table>
</td></tr>

<!-- Card -->
<tr><td class="email-card" style="background-color:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden">
${content}
</td></tr>

<!-- Footer -->
<tr><td style="padding:32px 0 0 0;text-align:center">
<p class="email-muted" style="margin:0 0 8px;font-size:12px;color:#6b7280;line-height:1.5">
CyberXscore &mdash; Cybersecurity Assessment for SMBs
</p>
<p style="margin:0;font-size:12px;color:#4b5563;line-height:1.5">
&copy; 2026 BITUP TECHNOLOGY. You received this because you have an account at
<a href="https://mvp.cyberxscore.com" style="color:#6b7280;text-decoration:none">mvp.cyberxscore.com</a>
</p>
</td></tr>

</table>

</td></tr>
</table>

<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}
