import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
const window = new JSDOM('').window;
const purify = DOMPurify(window);
const sanitized = purify.sanitize('AT&amp;T', { ALLOWED_TAGS: [], RETURN_DOM: true });
console.log(sanitized.textContent);
