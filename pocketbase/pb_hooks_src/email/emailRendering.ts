/**
 * Simple Markdown to HTML renderer for backend email dispatch.
 * Supports: Bold, Italic, Links, Unordered Lists, Ordered Lists, Headings, Line Breaks.
 */
export function renderMarkdown(text: string): string {
    if (!text) return "";

    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Headings: # h1, ## h2, ### h3, #### h4, ##### h5, ###### h6
    html = html.replace(/^(#{1,6})\s+(.*)/gm, (_, hashes, content) => {
        const level = hashes.length;
        // Using inline styles for headings for better email client compatibility
        const fontSize = level === 1 ? '1.8rem' : level === 2 ? '1.5rem' : level === 3 ? '1.25rem' : '1.1rem';
        return `<h${level} style="margin: 16px 0 8px 0; line-height: 1.2; font-size: ${fontSize}; color: #2c3e50;">${content}</h${level}>`;
    });

    // Bold: **text** or __text__
    html = html.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");

    // Italic: *text* or _text_
    html = html.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");

    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
        const sanitizedUrl = url.trim();
        if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
            return text;
        }
        const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
    });


    // Lists (Ordered and Unordered)
    const lines = html.split("\n");
    let inUl = false;
    let inOl = false;
    const processedLines = lines.map(line => {
        const ulMatch = line.match(/^(\*|-)\s+(.*)/);
        const olMatch = line.match(/^(\d+)\.\s+(.*)/);

        if (ulMatch) {
            const content = ulMatch[2];
            let prefix = "";
            if (inOl) { inOl = false; prefix = "</ol>"; }
            if (!inUl) {
                inUl = true;
                return prefix + `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        } else if (olMatch) {
            const content = olMatch[2];
            let prefix = "";
            if (inUl) { inUl = false; prefix = "</ul>"; }
            if (!inOl) {
                inOl = true;
                return prefix + `<ol style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        } else {
            let result = line;
            if (inUl) { inUl = false; result = "</ul>" + line; }
            if (inOl) { inOl = false; result = "</ol>" + line; }
            return result;
        }
    });
    if (inUl) processedLines.push("</ul>");
    if (inOl) processedLines.push("</ol>");
    html = processedLines.join("\n");

    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("<ul")) return block;
        if (trimmed.startsWith("<ol")) return block;
        if (trimmed.match(/^<h\d/)) return block;
        if (trimmed.startsWith("<div")) return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");

    return html;
}

