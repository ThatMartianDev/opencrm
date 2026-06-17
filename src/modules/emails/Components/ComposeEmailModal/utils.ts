import { createLinkMatcherWithRegExp } from "@lexical/react/LexicalAutoLinkPlugin";

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}



export function isBodyEmpty(html: string): boolean {
  if (!html) return true;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = (doc.body.textContent || "").trim();
  const hasStructure = !!doc.body.querySelector(
    "ul,ol,li,blockquote,img,table",
  );
  return text.length === 0 && !hasStructure;
}



const URL_MATCHER = createLinkMatcherWithRegExp(
  /https?:\/\/[^\s]+/i,
  (text) => text
);

const EMAIL_MATCHER = createLinkMatcherWithRegExp(
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  (text) => `mailto:${text}`
);

const WWW_MATCHER = createLinkMatcherWithRegExp(
  /(?:^|\s)(www\.[^\s]+\.[^\s]{2,})/i,
  (text) => {
    const cleaned = text.trim();
    return `https://${cleaned}`;
  }
);

const DOMAIN_MATCHER = createLinkMatcherWithRegExp(
  /(?:^|\s)([a-zA-Z0-9-]+\.(com|net|org|io|ai|dev|co|me|app|xyz))(?:\s|$)/i,
  (text) => {
    const cleaned = text.trim();
    return `https://${cleaned}`;
  }
);

const PHONE_MATCHER = createLinkMatcherWithRegExp(
  /\+?[0-9][0-9()\-\s]{6,}[0-9]/,
  (text) => `tel:${text.replace(/\s/g, "")}`
);

export const MATCHERS = [
  URL_MATCHER,
  EMAIL_MATCHER,
  WWW_MATCHER,
  DOMAIN_MATCHER,
  PHONE_MATCHER,
];
