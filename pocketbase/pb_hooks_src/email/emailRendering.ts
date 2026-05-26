
/**
 * Simple Markdown to HTML renderer for backend email dispatch.
 */
export function renderMarkdown(text: string): string {
    if (!text) return "";

    // Escape raw HTML first
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

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


    // Unordered Lists
    const lines = html.split("\n");
    let inList = false;
    const processedLines = lines.map(line => {
        const listMatch = line.match(/^(\*|-)\s+(.*)/);
        if (listMatch) {
            const content = listMatch[2];
            if (!inList) {
                inList = true;
                return `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        } else {
            if (inList) {
                inList = false;
                return `</ul>${line}`;
            }
            return line;
        }
    });
    if (inList) processedLines.push("</ul>");
    html = processedLines.join("\n");

    // Line breaks and paragraphs
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        if (block.trim().startsWith("<ul")) return block;
        if (block.trim().startsWith("<div")) return block; // Keep footers/buttons intact
        return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, "<br>")}</p>`;
    }).join("\n");

    return html;
}
