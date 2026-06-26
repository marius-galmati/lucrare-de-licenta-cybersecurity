const PRIMARY = '#21d5ed';
const PRIMARY_LIGHT = '#5ae0f2';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function welcomeTemplate(companyName: string): string {
  const safeName = escapeHtml(companyName);
  const assessmentUrl = 'https://mvp.cyberxscore.com/assessment';

  return `
<!-- Accent bar -->
<div style="height:4px;background:linear-gradient(90deg,${PRIMARY} 0%,${PRIMARY_LIGHT} 100%)"></div>

<div style="padding:40px 40px 48px">

<!-- Shield icon -->
<div style="text-align:center;margin-bottom:24px">
<table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center">
<tr><td style="width:56px;height:56px;border-radius:14px;background-color:#0f2f33;text-align:center;vertical-align:middle">
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${PRIMARY}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
</td></tr>
</table>
</div>

<!-- Heading -->
<h1 class="email-heading" style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.3px;line-height:1.3">Welcome to CyberXscore</h1>

<p style="margin:0 0 32px;font-size:15px;color:${PRIMARY};text-align:center;font-weight:600">${safeName}</p>

<!-- Body text -->
<p class="email-text" style="margin:0 0 32px;font-size:16px;color:#9ca3af;text-align:center;line-height:1.6">Your account is ready. CyberXscore helps you understand your organization&rsquo;s cybersecurity posture with a guided assessment that takes just minutes to complete.</p>

<!-- Feature highlights -->
<table cellpadding="0" cellspacing="0" border="0" role="presentation" width="100%" style="margin-bottom:32px">
<tr>
<td style="padding:16px;background-color:#111111;border-radius:10px;vertical-align:top;width:33%">
<div style="text-align:center">
<div style="font-size:24px;margin-bottom:8px">&#128203;</div>
<p style="margin:0;font-size:13px;font-weight:600;color:#d1d5db;line-height:1.4">Assess your security posture</p>
</div>
</td>
<td style="width:12px"></td>
<td style="padding:16px;background-color:#111111;border-radius:10px;vertical-align:top;width:33%">
<div style="text-align:center">
<div style="font-size:24px;margin-bottom:8px">&#128161;</div>
<p style="margin:0;font-size:13px;font-weight:600;color:#d1d5db;line-height:1.4">Get actionable recommendations</p>
</div>
</td>
<td style="width:12px"></td>
<td style="padding:16px;background-color:#111111;border-radius:10px;vertical-align:top;width:33%">
<div style="text-align:center">
<div style="font-size:24px;margin-bottom:8px">&#128200;</div>
<p style="margin:0;font-size:13px;font-weight:600;color:#d1d5db;line-height:1.4">Track your progress over time</p>
</div>
</td>
</tr>
</table>

<!-- CTA Button -->
<div style="text-align:center;margin-bottom:32px">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${assessmentUrl}" style="height:48px;v-text-anchor:middle;width:260px" arcsize="21%" fillcolor="${PRIMARY}"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600">Start Your Assessment</center></v:roundrect><![endif]-->
<!--[if !mso]><!-->
<a href="${assessmentUrl}" style="display:inline-block;padding:14px 36px;background-color:${PRIMARY};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.1px;mso-padding-alt:0;text-align:center">Start Your Assessment</a>
<!--<![endif]-->
</div>

<!-- Divider -->
<div class="email-divider" style="border-top:1px solid #2a2a2a;margin:32px 0"></div>

<!-- Security badge -->
<div style="text-align:center">
<table cellpadding="0" cellspacing="0" border="0" role="presentation" align="center">
<tr>
<td style="vertical-align:middle;padding-right:8px">
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
</td>
<td style="vertical-align:middle">
<span style="font-size:12px;color:#6b7280">Your data is encrypted and private</span>
</td>
</tr>
</table>
</div>

</div>`;
}

export function welcomeText(companyName: string): string {
  return `Welcome to CyberXscore, ${companyName}!
==========================================

Your account is ready. CyberXscore helps you understand your
organization's cybersecurity posture with a guided assessment
that takes just minutes to complete.

What you can do:
- Assess your security posture
- Get actionable recommendations
- Track your progress over time

Start your assessment:
https://mvp.cyberxscore.com/assessment

Your data is encrypted and private.

---
CyberXscore — Cybersecurity Assessment for SMBs
© 2026 BITUP TECHNOLOGY
https://mvp.cyberxscore.com`;
}
