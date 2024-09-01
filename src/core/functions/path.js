"use strict";

export const path = {
    /**
     * Returns the base name of a file path.
     * @param {string} path - The path from which to extract the base name.
     * @param {string} [suffix] - Optional suffix to be removed from the base name.
     * @returns {string} The base name of the path.
     */
    basename(path, suffix) {
        const parts = path.split("/");
        const basename = parts[parts.length - 1];
        return suffix && basename.endsWith(suffix)
            ? basename.substring(0, basename.length - suffix.length)
            : basename;
    },
    /**
     * Computes the relative path from one path to another.
     * @param {string} from - The source path.
     * @param {string} to - The target path.
     * @returns {string} The relative path from "from" to "to".
     */
    relative(from, to) {
        const fromParts = from.split("/");
        const toParts = to.split("/");
        // Remove common parts
        while (fromParts.length > 0 && toParts.length > 0 && fromParts[0] === toParts[0]) {
            fromParts.shift();
            toParts.shift();
        }
        if (from.endsWith(".html")) {
            fromParts.pop();
        }
        // Add ".." for each remaining part in "fromPath"
        const upLevels = fromParts.map(() => "..");
        // Concatenate remaining parts of "toPath"
        const resultPath = upLevels.concat(toParts).join("/");
        return resultPath;
    }
}