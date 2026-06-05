
const slugify = (str: string) => {
    const slug = str
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, "-")
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes
    if (!slug) return "workspace"; // Fallback for empty result
    return slug.slice(0, 64); // Limit length
}

export { slugify };