"use strict";

/**
 * Sets CSS properties on an element.
 *
 * @param {HTMLElement} el - The element on which to set CSS properties.
 * @param {Object} properties - An object where keys are CSS property names and values are the corresponding values to set.
 */
export function setCSSProperties(el, properties) {
    for (const [name, value] of Object.entries(properties)) {
        el.style.setProperty(name, value);
    }
}

/**
 * Unsets CSS properties on an element.
 *
 * @param {HTMLElement} el - The element from which to remove CSS properties.
 * @param {Array<string>} properties - An array of CSS property names to remove.
 */
export function unsetCSSProperties(el, properties) {
    for (const name of properties) {
        el.style.removeProperty(name);
    }
    if (el.getAttribute("style") === "") {
        el.removeAttribute("style");
    }
}

/**
 * Builds a CSS inset value using the specified values for top, right, bottom, and left.
 *
 * @param {Object} options - Optional. An object containing the inset values.
 * @param {string} [options.top="auto"] - The inset value for the top.
 * @param {string} [options.right="auto"] - The inset value for the right.
 * @param {string} [options.bottom="auto"] - The inset value for the bottom.
 * @param {string} [options.left="auto"] - The inset value for the left.
 * @returns {string} The built CSS inset value.
 */
export function buildInsetCSSValue({ top = "auto", right = "auto", bottom = "auto", left = "auto" } = {}) {
    const formatValue = value => {
        return value === "auto" ? "auto" : `${value}px`;
    }
    return `${formatValue(top)} ${formatValue(right)} ${formatValue(bottom)} ${formatValue(left)}`;
}