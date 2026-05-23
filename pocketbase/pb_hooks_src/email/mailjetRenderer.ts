import { EMAIL_CSS } from './emailStyles';

/**
 * Wraps Markdown-compiled text into a highly compatible, responsive transactional HTML layout.
 */
export function compileMailjetHtml(contentHtml: string, mailingAddress: string, unsubscribeUrl: string, headerTitle?: string): string {
    const displayTitle = headerTitle || "Choir Management";
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        ${EMAIL_CSS}
    </style>
</head>
<body>
    <table class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="header">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">${displayTitle}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            ${contentHtml}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 8px 0;">${mailingAddress}</p>
                            <p style="margin: 0;">You are receiving this because you are an active member of the choir.</p>
                            <p style="margin: 8px 0 0 0;"><a href="${unsubscribeUrl}">Unsubscribe from these emails</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}
