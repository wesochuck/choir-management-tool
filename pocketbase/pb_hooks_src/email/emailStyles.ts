/**
 * Stylesheet for transaction email templates.
 * Extracted to ensure clean separation between styles and document structure.
 */
export const EMAIL_CSS = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f5; color: #1a202c; }
.wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f5; padding-bottom: 40px; pt: 20px; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.header { background-color: #4a7c59; padding: 24px; text-align: center; color: #ffffff; }
.content { padding: 32px; line-height: 1.6; font-size: 16px; }
.footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7; }
a { color: #4a7c59; text-decoration: underline; }
.btn { display: inline-block; padding: 12px 24px; background-color: #4a7c59; color: #ffffff !important; border-radius: 6px; font-weight: bold; text-decoration: none; margin-top: 16px; }
`.trim();
