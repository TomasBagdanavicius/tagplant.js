"use strict";

import { isNullish } from "./misc.js";

/**
 * Checks if a value is a non-null object.
 *
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is a non-null object, false otherwise.
 */
export function isNonNullObject(value) {
    return typeof value === "object" && value !== null;
}

/**
 * Generates a sorter function based on specified criteria to sort items.
 *
 * @param {Object} options - Options object.
 * @param {string} options.sortCriteria - Criteria for sorting (e.g., "property1 ASC, property2 DESC").
 * @param {string} options.path - Optional path to nested property for sorting.
 * @param {boolean} [options.isPairs=false] - Whether the items are key-value pairs (e.g., [key, value]).
 * @returns {Function} Sorter function that compares two items based on the specified criteria.
 */
export function getItemsSorter({ sortCriteria, path, isPairs = false } = {}) {
    return function (a, b) {
        const criteria = sortCriteria.split(",").map(item => item.trim());
        for (let criterion of criteria) {
            const [property, direction] = criterion.split(" ");
            // Defaults to ASC if direction is omitted
            const comparison = direction === "DESC" ? -1 : 1;
            const itemA = !isPairs ? a : a[1];
            const itemB = !isPairs ? b : b[1];
            let valueA = itemA[property];
            let valueB = itemB[property];
            if (path) {
                valueA = itemA[property][path] || itemA[property];
                valueB = itemB[property][path] || itemB[property];
            }
            if (typeof valueA === "string" && typeof valueB === "string") {
                const comparisonResult = String(valueA).localeCompare(String(valueB), undefined, {
                    sensitivity: "base"
                });
                if (comparisonResult !== 0) {
                    return comparisonResult * comparison;
                }
            } else {
                // If not strings, compare numerically
                valueA = parseFloat(valueA);
                valueB = parseFloat(valueB);
                if (valueA < valueB) {
                    return -1 * comparison;
                } else if (valueA > valueB) {
                    return 1 * comparison;
                }
            }
        }
        // If all criteria are equal, return 0
        return 0;
    };
}

/**
 * Generate an iterator for key-value pairs from an object.
 *
 * @param {Object} obj - The object to iterate over.
 * @yields {[string, any]} Yields key-value pairs as arrays where the first element is the key and the second element is the corresponding value.
 */
export function* objectIterator(obj) {
    for (const key of Object.keys(obj)) {
        yield [key, obj[key]];
    }
}

/**
 * Filters the properties of an object based on a provided callback function.
 *
 * @param {object} object - The object to filter.
 * @param {function} callback - The callback function to test each property. Should take two parameters: (name, value).
 * @param {boolean} [toArray=false] - Whether the result should be an array (`true`) or an object (`false`).
 * @returns {object|Array} Returns the filtered object or array based on the callback.
 */
export function objectFilter(object, callback, toArray = false) {
    const result = !toArray ? {} : [];
    for (const [name, value] of Object.entries(object)) {
        if (callback(name, value)) {
            if (!toArray) {
                result[name] = value;
            } else {
                result.push(value);
            }
        }
    }
    return result;
}

/**
 * Removes all own properties from an object.
 *
 * @param {Object} object - The object from which to remove properties.
 */
export function objectUnassign(object) {
    for (let key in object) {
        if (Object.hasOwn(object, key)) {
            delete object[key];
        }
    }
}

/**
 * Recursively merges objects while keeping distinct values (non-overlapping keys).
 *
 * @param {...Object} objects - Objects to merge.
 * @returns {Object} Merged object with distinct values.
 */
export function objectMergeRecursiveDistinct(...objects) {
    if (objects.length === 0) {
        return {};
    } else if (objects.length === 1) {
        return objects[0];
    }
    const merged = {};
    for (const obj of objects) {
        if (typeof obj !== "object") {
            continue;
        }
        for (const key in obj) {
            if (Object.hasOwn(obj, key)) {
                if (
                    typeof merged[key] === "object"
                    && typeof obj[key] === "object"
                    // Is a plain object
                    && Object.getPrototypeOf(obj[key]) === Object.prototype
                ) {
                    merged[key] = objectMergeRecursiveDistinct(merged[key], obj[key]);
                } else {
                    merged[key] = obj[key];
                }
            }
        }
    }
    return merged;
}

/**
 * Retrieves a nested value from an object based on an array of path parts.
 *
 * @param {Object} obj - The object to retrieve the value from.
 * @param {Array<string|number>} pathParts - Array of path parts defining the nested structure.
 * @returns {*} The retrieved value or undefined if the path is not fully accessible.
 */
export function objectRetrieveInnerValueByPathParts(obj, pathParts) {
    return pathParts.reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Retrieves a nested value from an object based on a string path using a divider.
 *
 * @param {Object} obj - The object to retrieve the value from.
 * @param {string} path - String path defining the nested structure, separated by a divider.
 * @param {Object} options - Options object.
 * @param {string} [options.divider="."] - Divider used to split the string path into parts.
 * @returns {*} The retrieved value or undefined if the path is not fully accessible.
 */
export function objectRetrieveInnerValueByStringPath(obj, path, { divider = "." } = {}) {
    return objectRetrieveInnerValueByPathParts(obj, path.split(divider));
}

/**
 * Determines configuration values from a data object based on a mapping.
 *
 * @param {Object} map - Mapping of configuration names to paths or path arrays in the data object.
 * @param {Object} data - Data object from which to retrieve configuration values.
 * @param {Object} options - Options object.
 * @param {string[]} options.validProps - Array of valid property names to consider from the map (optional).
 * @param {boolean} [options.includeNullish=false] - Whether to include nullish (undefined or null) values in the config (default: false).
 * @param {boolean} [options.considerArrayAsMultiPath=false] - Whether to consider array paths as multiple paths and retrieve the first non-nullish value (default: false).
 * @returns {Object} Config object containing the determined configuration values.
 */
export function determineConfigByMap(map, data, {
    validProps,
    includeNullish = false,
    considerArrayAsMultiPath = false,
} = {}) {
    const config = {};
    for (const [name, path] of Object.entries(map)) {
        if (!validProps || validProps.includes(name)) {
            let value;
            if (typeof path === "string") {
                value = objectRetrieveInnerValueByStringPath(data, path);
            } else if (Array.isArray(path)) {
                if (!considerArrayAsMultiPath) {
                    value = objectRetrieveInnerValueByPathParts(data, path);
                } else {
                    for (const p of path) {
                        value = objectRetrieveInnerValueByStringPath(data, p);
                        if (!isNullish(value)) {
                            break;
                        }
                    }
                }
            }
            if (includeNullish || !isNullish(value)) {
                config[name] = value;
            }
        }
    }
    return config;
}

/**
 * Converts a NamedNodeMap to a plain object.
 *
 * @param {NamedNodeMap} map - The NamedNodeMap to convert.
 * @throws {TypeError} Throws an error if the parameter is not a NamedNodeMap.
 * @returns {Object} Plain object representation of the NamedNodeMap.
 */
export function namedNodeMapToObject(map) {
    if (!(map instanceof NamedNodeMap)) {
        throw new TypeError("Parameter #1 must be a named node map");
    }
    const result = Object.create(null);
    for (const attr of map) {
        result[attr.name] = attr.value;
    }
    return result;
}

/**
 * Filters an object by its keys.
 *
 * @param {Object} object - The object to filter.
 * @param {Array<string>|Object} keys - Array or object whose keys are used to filter the object.
 * @returns {Object} New object with only the keys present in the filter list.
 */
export function objectFilterByKeys(object, keys) {
    if (typeof keys === "object") {
        keys = Object.keys(keys);
    }
    const result = {};
    for (const key of Object.keys(object)) {
        if (keys.includes(key)) {
            result[key] = object[key];
        }
    }
    return result;
}

/**
 * Compares two objects to determine if they have the same keys and values.
 *
 * @param {Object} obj1 - The first object to compare.
 * @param {Object} obj2 - The second object to compare.
 * @returns {boolean} True if the objects have the same keys and values, false otherwise.
 */
export function compareTwoObjects(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
        return false;
    }
    for (let key of keys1) {
        if (!Object.hasOwn(obj2, key) || obj1[key] !== obj2[key]) {
            return false;
        }
    }
    return true;
}

/**
 * Validates the structure of an object based on a configuration.
 *
 * @param {Object} object - The object to validate.
 * @param {Array<{ name: string, type: string, required?: boolean }>} config - Configuration array defining properties to validate.
 * @throws {DOMException} Throws a validation error if the object structure does not match the configuration.
 */
export function objectValidateStructure(object, config) {
    if (typeof object !== "object") {
        throw new DOMException("Value must be an object", "ValidationError");
    }
    for (const { name, type, required } of config) {
        const has = Object.hasOwn(object, name);
        if (has) {
            if (typeof object[name] !== type) {
                throw new DOMException(`Property "${name}" must be of "${type}" type`, "ValidationError");
            }
        } else if (required) {
            throw new DOMException(`Property "${name}" is missing`, "ValidationError");
        }
    }
}

/**
 * Merges default options with custom options, optionally merging specific leaf properties deeply.
 *
 * @param {Object} defaultOptions - The default options object.
 * @param {Object} customOptions - The custom options object to merge.
 * @param {Array<string>} mergeLeafs - Array of property names to merge deeply from both default and custom options.
 * @returns {Object} Merged options object.
 */
export function mergeOptions(defaultOptions, customOptions, mergeLeafs = []) {
    const result = { ...defaultOptions, ...customOptions };
    for (const leaf of mergeLeafs) {
        if (Object.hasOwn(customOptions, leaf) && Object.hasOwn(defaultOptions, leaf)) {
            if (Array.isArray(customOptions[leaf]) && Array.isArray(defaultOptions[leaf])) {
                result[leaf] = [...defaultOptions[leaf], ...customOptions[leaf]];
            } else if (typeof customOptions[leaf] === "object" && typeof defaultOptions[leaf] === "object") {
                result[leaf] = { ...defaultOptions[leaf], ...customOptions[leaf] };
            }
        }
    }
    return result;
}