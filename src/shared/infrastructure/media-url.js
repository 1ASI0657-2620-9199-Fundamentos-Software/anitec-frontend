const serverUrl = import.meta.env.VITE_ANITEC_SERVER_URL;

/**
 * Builds the absolute URL for a relative media path returned by the backend (e.g. an uploaded image).
 * @param {string|null} path Relative path such as "/uploads/animals/xxx.jpg".
 * @returns {string|null}
 */
export function resolveMediaUrl(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${serverUrl}${path}`;
}
