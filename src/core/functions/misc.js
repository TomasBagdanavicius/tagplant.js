"use strict";

import { stringGetInnerText, stringTransliterateToLatin, wrapSubstringsWithElement } from "./string.js";
import { createHyperlink, valueToElement } from "./node.js";
import { promiseStates } from "./enumeration.js";
import { ExpiredAbortError, PromiseSeriesAbortException, TaskPerformApplicationException, TaskRevertApplicationException } from "../exceptions.js";
import { callbackIterator } from "../iterators/callback-iterator.js";

/**
 * Checks if a value is null or undefined.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is null or undefined, false otherwise.
 */
export function isNullish(value) {
    return value === undefined || value === null;
}

/**
 * Checks if a variable is iterable (either sync or async).
 *
 * @param {*} variable - The variable to be checked.
 * @returns {boolean} Returns true if the variable is iterable, otherwise false.
 */
export function isIterable(variable) {
    return Symbol.iterator in Object(variable) || Symbol.asyncIterator in Object(variable);
}

/**
 * Checks if an object is an async iterable by looking for a Symbol.asyncIterator property.
 *
 * @param {any} variable - The variable to check for async iterable capability.
 * @returns {boolean} Returns true if the variable is an async iterable, false otherwise.
 */
export function isAsyncIterable(variable) {
    return Symbol.asyncIterator in Object(variable);
}

/**
 * Converts a Blob object to a data URL synchronously.
 * @param {Blob} blob - The Blob object to be converted.
 * @returns {string} The resulting data URL.
 */
export function blobToDataURLSync(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read blob as data URL"));
        reader.readAsDataURL(blob);
    });
}

/**
 * Opens a URL in a new browser tab/window with focus.
 *
 * @param {string} url - The URL to open in the new tab/window.
 * @returns {void}
 */
export function openInNewTab(url) {
    const win = window.open(url, "_blank", "noopener");
    win.focus();
}

/**
 * Converts SVG code to a Blob with SVG MIME type.
 *
 * @param {string} svgCode - The SVG code as a string.
 * @returns {Blob} The SVG content as a Blob with SVG MIME type.
 */
export function SVGCodeToBlob(svgCode) {
    return new Blob([svgCode], { type: "image/svg+xml" });
}

/**
 * Saves a key-value pair into the browser's local storage.
 *
 * @param {string} keyName - The key under which to store the value.
 * @param {string} keyValue - The value to be stored in local storage.
 * @returns {boolean} `true` if the operation was successful, `false` if an error occurred.
 */
export function saveIntoLocalStorage(keyName, keyValue) {
    try {
        localStorage.setItem(keyName, keyValue);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

/**
 * Writes the given text to the clipboard.
 * @param {string} text - The text to write to the clipboard.
 * @returns {Promise<string>} A promise that resolves with the text if successful,
 *                            or rejects with an error if unable to write.
 */
export function writeTextToClipboard(text) {
    return new Promise((resolve, reject) => {
        navigator.clipboard.writeText(text).then(() => {
            const copyEvent = new CustomEvent("copytoclipboard", {
                detail: { text }
            });
            document.dispatchEvent(copyEvent);
            resolve(text);
        }).catch(error => {
            const copyErrorEvent = new CustomEvent("copytoclipboarderror", {
                detail: { text, error }
            });
            document.dispatchEvent(copyErrorEvent);
            reject(error, text);
        });
    });
}

/**
 * Check if a value matches a search term in a case and accent-insensitive manner.
 *
 * @param {string|number} value - The value to be checked for a match.
 * @param {string} searchTerm - The search term to match against.
 * @param {boolean} [caseInsensitive=false] - Set to true for case-insensitive matching.
 * @param {boolean} [accentInsensitive=false] - Set to true for accent-insensitive matching.
 * @returns {boolean} Returns true if there a match, otherwise false.
 */
export function valueSearch(value, searchTerm, caseInsensitive = false, accentInsensitive = false) {
    const valueType = typeof value;
    let searchableString = null;
    if (valueType === "string" && accentInsensitive) {
        searchableString = stringTransliterateToLatin(value);
    } else if (valueType === "number") {
        searchableString = String(value);
    }
    if (accentInsensitive) {
        searchTerm = stringTransliterateToLatin(searchTerm);
    }
    if (searchableString) {
        if (caseInsensitive) {
            searchableString = searchableString.toLowerCase();
            searchTerm = searchTerm.toLowerCase();
        }
        // `String.prototype.indexOf` is case sensitive.
        const index = searchableString.indexOf(searchTerm);
        if (index !== -1) {
            return true;
        }
    }
    return false;
}

/**
 * Search for values in an iterable in an accent and case-insensitive manner.
 *
 * @param {Iterable} iterable - The iterable to search through.
 * @param {string} searchTerm - The search term to match against.
 * @param {boolean} [caseInsensitive=false] - Set to true for case-insensitive matching.
 * @param {boolean} [accentInsensitive=false] - Set to true for accent-insensitive matching.
 * @throws {TypeError} If the iterable is not iterable.
 * @returns {Object|null} An object containing matched key-value pairs or null if no matches found.
 */
export function iterableValueSearch(iterable, searchTerm, caseInsensitive = false, accentInsensitive = false) {
    if (!isIterable(iterable)) {
        throw new TypeError("Parameter 1 #iterable is not iterable");
    }
    const result = {};
    let foundCount = 0;
    for (const [key, value] of iterable) {
        if (valueSearch(value, searchTerm, caseInsensitive, accentInsensitive)) {
            result[key] = value;
            foundCount++;
        }
    }
    return foundCount ? result : null;
}

/**
 * Searches and marks occurrences of a search string within an iterable collection.
 *
 * @param {Iterable<[string, any]>} iterable - The iterable collection to search through, where each entry is a tuple of [name, value].
 * @param {string} search - The string to search for within each value.
 * @param {Object} options - Options object.
 * @param {boolean} [options.keepOriginal=false] - Whether to keep the original values in the result (default: false).
 * @param {boolean} [options.caseInsensitive=false] - Whether the search should be case insensitive (default: false).
 * @param {boolean} [options.accentInsensitive=false] - Whether the search should be accent insensitive (default: false).
 * @returns {[Object, number]} An array where the first element is an object with marked values (or originals if keepOriginal is true),
 *                             and the second element is the count of found occurrences.
 */
export function iterableSearchMarked(iterable, search, { keepOriginal = false, caseInsensitive = false, accentInsensitive = false } = {}) {
    const element = Object.create(null);
    let foundCount = 0;
    for (let [name, value] of iterable) {
        const rawValue = value;
        const valueType = typeof value;
        if (valueType === "string" || valueType === "number") {
            value = String(value);
            const result = wrapSubstringsWithElement(value, search, "mark", caseInsensitive, accentInsensitive);
            // Found
            if (result instanceof DocumentFragment) {
                if (!keepOriginal) {
                    element[name] = result;
                } else {
                    element[name] = { rawValue, value: result }
                }
                foundCount++;
            }
        }
        if (!(name in element)) {
            element[name] = rawValue;
        }
    }
    return [element, foundCount];
}

/**
 * Retrieves the text value from an object for a specified element.
 *
 * @param {Object} obj - The object from which to retrieve the value.
 * @param {string} element - The element/key whose value to retrieve from the object.
 * @returns {string} The inner text value of the specified element in the object.
 */
export function getTextValue(obj, element) {
    const value = obj[element].rawValue || obj[element];
    return stringGetInnerText(value);
}

/**
 * Wraps a given function in a promise.
 *
 * @param {Function} fn - The function to wrap in a promise.
 * @returns {Function} A new function that returns a Promise when invoked.
 */
export function wrapInPromise(fn) {
    return function(...args) {
        return new Promise((resolve, reject) => {
            try {
                const result = fn(...args);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    };
}

/**
 * Executes an array of tasks in series, handling potential abort signals and task-specific revert logic.
 *
 * @param {Array<Function|Object>} tasks - The tasks to be executed. Each task can be a function or an object with `perform` and optional `revert` functions.
 * @param {Object} [options] - Optional settings for task execution.
 * @param {AbortSignal} [options.signal] - An optional AbortSignal to cancel the task series.
 * @param {Function} [options.onPerform] - A callback function called after each task is performed.
 * @param {Function} [options.onEnd] - A callback function called when the series ends, either successfully or with an error.
 * @param {Array} [options.initialValues] - Initial values to pass to the tasks.
 * @returns {Promise<Array>} A promise that resolves to an array of results from the tasks.
 */
export function promiseSeries(tasks, { signal, onPerform, onEnd, initialValues = [] } = {}) {
    if (!tasks.length) {
        return Promise.resolve([]);
    }
    validateVarInterface(signal, AbortSignal, { allowUndefined: true });
    const tasksTotal = tasks.length;
    return new Promise((resolve, reject) => {
        const values = initialValues;
        const revertCollection = [];
        let lastResultBeforeRevertResolver;
        let runTasks = true;
        const end = (state, error, waitForLastResult = true) => {
            let revertsCompletePromise;
            if (state === promiseStates.fulfilled) {
                resolve(values);
            } else {
                reject(error);
                const { promise: completePromise, resolve: revertsCompletePromiseResolver, reject: revertsCompletePromiseRejecter } = Promise.withResolvers();
                revertsCompletePromise = completePromise;
                if (revertCollection.length) {
                    const { promise, resolve } = Promise.withResolvers();
                    if (waitForLastResult) {
                        lastResultBeforeRevertResolver = resolve;
                    } else {
                        resolve();
                    }
                    promise.then(lastResult => {
                        const elements = [];
                        for (const revert of revertCollection) {
                            elements.push(revert(values, lastResult));
                        }
                        Promise.all(elements).then(() => {
                            revertsCompletePromiseResolver();
                        }).catch(error => {
                            error = new TaskRevertApplicationException("Could not revert task", error);
                            revertsCompletePromiseRejecter(error);
                        });
                    });
                } else {
                    revertsCompletePromiseResolver();
                }
            }
            if (typeof onEnd === "function") {
                onEnd({ state, values, error, revertPromise: revertsCompletePromise });
            }
        }
        if (signal) {
            const abort = () => {
                end(promiseStates.rejected, new PromiseSeriesAbortException("Promise series was aborted"));
            }
            if (!signal.aborted) {
                signal.addEventListener("abort", () => {
                    if (!(signal.reason instanceof ExpiredAbortError)) {
                        abort();
                    }
                });
            } else {
                runTasks = false;
                abort();
            }
        }
        if (runTasks) {
            let countPerform = 0;
            let stopped = false;
            const processTask = index => {
                if (stopped) {
                    return;
                }
                const task = tasks[index];
                const number = index + 1;
                let perform, revert;
                if (typeof task === "function") {
                    perform = task;
                } else {
                    ({ perform, revert } = task);
                }
                const footer = () => {
                    if (tasksTotal === number) {
                        end(promiseStates.fulfilled);
                    } else {
                        processTask(number);
                    }
                }
                if (perform) {
                    let result;
                    // Accept async and non-async functions. Requires `then`, because Promise executor should not be async.
                    wrapInPromise(perform.bind(this, values, signal))().then(value => {
                        result = value;
                    }).catch(error => {
                        if (error.name !== "AbortError") {
                            let taskError = new TaskPerformApplicationException(`Could not perform task: ${error.message}`, error);
                            end(promiseStates.rejected, taskError, false);
                            stopped = true;
                        } else {
                            revert = false;
                        }
                    }).finally(() => {
                        if (!stopped) {
                            if (revert) {
                                revertCollection.push(revert);
                            }
                            if (signal && signal.aborted) {
                                if (lastResultBeforeRevertResolver) {
                                    lastResultBeforeRevertResolver(result);
                                }
                            } else {
                                values.push(result);
                                countPerform++;
                                if (typeof onPerform === "function") {
                                    onPerform(countPerform, tasksTotal);
                                }
                                footer();
                            }
                        }
                    });
                } else {
                    footer();
                }
            };
            processTask(0);
        }
    });
}

/**
 * Checks if the given value implements at least one of the specified interfaces/classes.
 *
 * @param {*} value - The value to check.
 * @param {Function[]} interfaces - An array of interface/class constructors to check against.
 * @returns {boolean} True if the value implements at least one of the interfaces/classes, false otherwise.
 */
export function implementsAtLeastOne(value, interfaces) {
    for (const element of interfaces) {
        if (value instanceof element) {
            return true;
        }
    }
    return false;
}

/**
 * Validates that a variable implements at least one of the specified interfaces/classes.
 *
 * @param {*} value - The value to validate.
 * @param {Function|Function[]} acceptedInterfaces - Interface/class constructor(s) that the value should implement.
 * @param {Object} options - Options object.
 * @param {number} [options.paramNumber=1] - The parameter number (for error message).
 * @param {boolean} [options.allowUndefined=false] - Whether to allow the value to be undefined (default: false).
 * @throws {TypeError} Throws a TypeError if the value does not implement any of the accepted interfaces/classes.
 */
export function validateVarInterface(value, acceptedInterfaces, { paramNumber = 1, allowUndefined = false } = {}) {
    if (!allowUndefined || value !== undefined) {
        if (Array.isArray(acceptedInterfaces)) {
            if (!implementsAtLeastOne(value, acceptedInterfaces)) {
                const formatter = new Intl.ListFormat(document.documentElement.lang, { style: "long", type: "conjunction" });
                const listStr = formatter.format(acceptedInterfaces.map(constructor => constructor.name));
                throw new TypeError(`Parameter #${paramNumber} must implement at least one of the following: ${listStr}`);
            }
        } else if (!(value instanceof acceptedInterfaces)) {
            const constructor = acceptedInterfaces;
            throw new TypeError(`Parameter #${paramNumber} must implement interface ${constructor.name}`);
        }
    }
}

/**
 * Executes a callback at regular intervals, starting from a specified number.
 *
 * @param {function(number)} callback - The callback function to execute at each interval.
 * @param {AbortSignal} signal - An AbortSignal object that can be used to abort the interval counter.
 * @param {Object} options - Options object.
 * @param {number} [options.interval=1000] - The interval (in milliseconds) at which to execute the callback (default: 1000).
 * @param {number} [options.start=1] - The starting number for the interval counter (default: 1).
 * @param {boolean} [options.immediatelly=false] - Whether to execute the callback immediately with the start value (default: false).
 */
export function intervalCounter(callback, signal, { interval = 1_000, start = 1, immediatelly = false } = {}) {
    if (signal.aborted) {
        return;
    }
    let iterator = start;
    if (immediatelly) {
        callback(start);
        iterator++;
    }
    let intervalId;
    intervalId = setInterval(() => {
        callback(iterator);
        iterator++;
    }, interval);
    signal.addEventListener("abort", () => {
        clearInterval(intervalId);
    });
}

/**
 * Executes a callback at one-second intervals, formatting the iterator as seconds.
 *
 * @param {function(string)} callback - The callback function to execute at each interval, accepting a formatted string.
 * @param {AbortSignal} signal - An AbortSignal object that can be used to abort the interval counter.
 * @param {Object} [options] - Optional parameters.
 * @param {boolean} [options.immediatelly=false] - If true, the callback is executed immediately before the first interval.
 */
export function secondsIntervalCounter(callback, signal, { immediatelly = false } = {}) {
    const formatter = new Intl.NumberFormat(document.documentElement.lang, {
        style: "unit",
        unit: "second",
        unitDisplay: "short",
    });
    intervalCounter(iterator => {
        callback(formatter.format(iterator));
    }, signal, { interval: 1_000, start: 1, immediatelly });
}

/**
 * Searches through an iterable collection and wraps occurrences of a search query with <mark> elements.
 *
 * @param {Iterable} iterable - The iterable collection to search through.
 * @param {string} searchQuery - The search query to mark within the values of the iterable.
 * @returns {Iterable} An iterable where occurrences of the search query are wrapped with <mark> elements.
 */
export function searchIterator(iterable, searchQuery) {
    return callbackIterator(iterable, value => {
        if (typeof value === "string" || typeof value === "number") {
            value = String(value);
            return () => {
                const el = valueToElement(value);
                el.replaceChildren();
                el.append(wrapSubstringsWithElement(value, searchQuery, "mark", true, true));
                return el;
            }
        }
        return value;
    });
}

/**
 * Clones a CustomEvent object.
 *
 * @param {CustomEvent} event - The CustomEvent object to clone.
 * @returns {CustomEvent} A new CustomEvent object with the same type and detail as the original event.
 * @throws {TypeError} Throws a TypeError if the event parameter is not a CustomEvent.
 */
export function cloneCustomEvent(event) {
    validateVarInterface(event, CustomEvent);
    return new CustomEvent(event.type, { detail: event.detail });
}

/**
 * Validates an attachment controller object to ensure it has required methods.
 *
 * @param {Object} controller - The attachment controller object to validate.
 * @throws {TypeError} Throws a TypeError if the attachment controller is missing required methods or if methods are not functions.
 */
export function validateAttachmentController(controller) {
    if ("attach" in controller) {
        throw new TypeError(`Attachment controller is missing the "attach" method`);
    }
    if (typeof controller.attach !== "function") {
        throw new TypeError(`"attach" property is not a function`);
    }
    if ("remove" in controller) {
        throw new TypeError(`Attachment controller is missing the "remove" method`);
    }
    if (typeof controller.remove !== "function") {
        throw new TypeError(`"remove" property is not a function`);
    }
}

/**
 * Parses a Data URL string into its MIME type and base64-encoded data parts.
 *
 * @param {string} dataURLString - The Data URL string to parse.
 * @returns {Object} An object containing the parsed MIME type and base64-encoded data.
 */
export function parseDataURLString(dataURLString) {
    const parts = dataURLString.split(",");
    const mimeType = parts[0].split(":")[1].split(";")[0];
    const base64Data = parts[1];
    return { mimeType, base64Data };
}

/**
 * Creates a Blob object from base64-encoded data.
 *
 * @param {string} encodedData - The base64-encoded data to create the Blob from.
 * @param {Object} options - Options object.
 * @param {string} [options.mimeType="image/jpeg"] - The MIME type of the Blob (default: "image/jpeg").
 * @returns {Blob} A Blob object created from the base64-encoded data.
 */
export function blobFromBase64(encodedData, { mimeType = "image/jpeg" } = {}) {
    const binaryData = atob(encodedData);
    const arrayBuffer = new ArrayBuffer(binaryData.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: mimeType });
}

/**
 * Converts a Blob object to a base64-encoded string.
 *
 * @param {Blob} blob - The Blob object to convert to base64.
 * @returns {Promise<Object>} A promise that resolves with an object containing the parsed MIME type and base64-encoded data.
 *                            Rejects with an error if the conversion fails.
 */
export async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader;
        fileReader.onload = event => {
            resolve(parseDataURLString(event.target.result));
        };
        fileReader.onerror = event => {
            reject(event.error);
        };
        fileReader.onabort = () => {
            reject(new DOMException("File reading operation aborted", "AbortError"));
        };
        fileReader.readAsDataURL(blob);
    });
}

/**
 * Searches for occurrences of a search string within a value and wraps them with <mark> elements,
 * then updates an element with the marked occurrences count.
 *
 * @param {string} value - The value to search within.
 * @param {string} search - The search string.
 * @param {Element} elem - The element to update with marked occurrences.
 * @param {Object} [index] - Optional index object to update with total occurrences count.
 * @returns {number|null} The number of occurrences found and marked, or null if no valid search or element provided.
 */
export function searchable(value, search, elem, index) {
    if (value && search && elem) {
        if (index && !Object.hasOwn(index, "total")) {
            index.total = 0;
        }
        const result = wrapSubstringsWithElement(value, search, "mark", true, true);
        if (result instanceof DocumentFragment) {
            const occurencesCount = result.children.length;
            elem.replaceChildren(result);
            if (index) {
                index.total += occurencesCount;
            }
            return occurencesCount;
        }
    }
    return null;
}

/**
 * Fills an element with a value and optionally marks occurrences of a search string within it.
 *
 * @param {Element} elem - The element to fill with content.
 * @param {string} value - The value to set as the text content of the element.
 * @param {string} search - The search string to mark within the value.
 * @param {string} [searchableValue] - The value to search and mark occurrences within (defaults to `value` if not provided).
 */
export function fillInSearachableElementValue(elem, value, search, searchableValue) {
    if (!value) {
        value = "N/A";
    }
    elem.textContent = value;
    if (search) {
        searchable(searchableValue ?? value, search, elem);
    }
}

/**
 * Delays execution asynchronously for the specified duration.
 *
 * @param {number} delay - The delay duration in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
export function sleep(delay) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, delay);
    });
}

/**
 * Compares two URLs to check if they are equivalent based on specified options.
 *
 * @param {string|URL} url1 - The first URL to compare.
 * @param {string|URL} url2 - The second URL to compare.
 * @param {Object} options - Options object.
 * @param {boolean} [options.compareQueryString=false] - Whether to compare query strings (default: false).
 * @param {boolean} [options.compareHash=false] - Whether to compare URL hashes (default: false).
 * @returns {boolean} True if the URLs are equivalent based on the specified comparison options, false otherwise.
 */
export function compareTwoUrls(url1, url2, { compareQueryString = false, compareHash = false } = {}) {
    // Parse URLs
    const parsedUrl1 = url1 instanceof URL ? url1 : new URL(url1);
    const parsedUrl2 = url2 instanceof URL ? url2 : new URL(url2);
    // Compare hostnames
    const hostname1 = parsedUrl1.hostname;
    const hostname2 = parsedUrl2.hostname;
    if (hostname1 !== hostname2) {
        return false;
    }
    // Compare ports
    const port1 = parsedUrl1.port || (parsedUrl1.protocol === "https:" ? "443" : "80");
    const port2 = parsedUrl2.port || (parsedUrl2.protocol === "https:" ? "443" : "80");
    if (port1 !== port2) {
        return false;
    }
    // Compare paths (ignoring trailing slashes)
    const path1 = parsedUrl1.pathname.replace(/\/$/, "");
    const path2 = parsedUrl2.pathname.replace(/\/$/, "");
    if (path1 !== path2) {
        return false;
    }
    // Compare query strings
    if (compareQueryString) {
        const queryString1 = Array.from(parsedUrl1.searchParams).sort().toString();
        const queryString2 = Array.from(parsedUrl2.searchParams).sort().toString();
        if (queryString1 !== queryString2) {
            return false;
        }
    }
    // Compare hashes
    if (compareHash) {
        if (parsedUrl1.hash !== parsedUrl2.hash) {
            return false;
        }
    }
    // URLs match
    return true;
}

/**
 * Default hyperlink builder object with a method to build hyperlinks.
 */
export const defaultHyperlinkBuilder = {
    buildHyperlink(url, content, attrs = {}) {
        return createHyperlink(url, content, attrs);
    }
}

/**
 * Validates a URL string.
 *
 * @param {string} url - The URL to validate.
 * @param {Object} options - Options object.
 * @param {string|URL} [options.base] - The base URL to use for parsing relative URLs.
 * @param {boolean} [options.throwOnError=true] - Whether to throw a TypeError on invalid URLs (default: true).
 * @returns {boolean} True if the URL is valid (or could be made valid by resolving against a base URL), false otherwise.
 */
export function validateURL(url, { base, throwOnError = true } = {}) {
    if (!URL.canParse(url, base)) {
        if (throwOnError) {
            throw TypeError("Invalid URL");
        }
        return false;
    }
    return true;
}

/**
 * Checks if a class or prototype is a sub-prototype of another.
 *
 * @param {Function} subClass - The potential subclass or prototype.
 * @param {Function} superClass - The superclass or prototype to check against.
 * @returns {boolean} True if subClass is a sub-prototype of superClass, false otherwise.
 */
export function isSubPrototypeOf(subClass, superClass) {
    let prototype = subClass;
    while (prototype) {
        if (prototype === superClass) {
            return true;
        }
        prototype = Object.getPrototypeOf(prototype);
    }
    return false;
}

/**
 * Dispatches a custom event and optionally returns a validated element from the payload.
 *
 * @param {string} typeName - The name of the custom event to dispatch.
 * @param {Object} payloadElements - The elements to include in the event's payload.
 * @param {string} expectedElementName - The name of the element in the payload that is expected.
 * @param {Function} expectedConstructor - The constructor function that the expected element should be an instance of.
 * @returns {Object|undefined} The expected element if it exists in the payload and is an instance of the expected constructor, otherwise `undefined`.
 */
export function issueHookEvent(typeName, payloadElements, expectedElementName, expectedConstructor) {
    // Used as object here to allow additions by 3rd party
    const payload = { ...payloadElements };
    document.dispatchEvent(new CustomEvent(typeName, {
        detail: { payload }
    }));
    if (Object.hasOwn(payload, expectedElementName)) {
        if (payload[expectedElementName] instanceof expectedConstructor) {
            return payload[expectedElementName];
        } else {
            console.warn(`Element must implement ${expectedConstructor.name} interface`);
        }
    }
}

/**
 * Sets up a message listener on a worker and invokes a callback with the received message data.
 *
 * @param {Worker|Object} worker - The worker instance. Can be a Web Worker or a Node.js worker.
 * @param {Function} callback - The callback function to be invoked with the message data.
 */
export function workerOnMessage(worker, callback) {
    if ("addEventListener" in worker) {
        worker.addEventListener("message", e => {
            callback(e.data);
        });
    } else if ("on" in worker) {
        worker.on("message", data => {
            callback(data);
        });
    }
}

/**
 * Manages click event listeners on the document.
 *
 * Allows registering and unregistering of callbacks with various options.
 * Automatically handles adding and removing event listeners based on the registered callbacks.
 */
export const documentClickRegistry = (() => {
    const registry = new Set;
    const defaultOptions = {
        capture: false,
        once: false,
        passive: false,
    }
    /**
     * Compares two options objects for equality.
     *
     * @param {Options} a - The first options object.
     * @param {Options} b - The second options object.
     * @returns {boolean} True if the options are equivalent, false otherwise.
     */
    function areOptionsEqual(a, b) {
        return a.capture === b.capture &&
               a.once === b.once &&
               a.passive === b.passive &&
               a.signal === b.signal;
    }
    return {
        /**
         * Registers a callback to be invoked when the document is clicked.
         *
         * @param {Function} callback - The function to be called on click events.
         * @param {Options} [options={}] - Options for the event listener.
         */
        register(callback, options = {}) {
            let found = false;
            for (const { options: opts, callbacks } of registry) {
                if (areOptionsEqual(opts, { ...defaultOptions, ...options })) {
                    callbacks.add(callback);
                    found = true;
                    break;
                }
            }
            if (!found) {
                const callbacks = new Set;
                callbacks.add(callback);
                const handler = e => {
                    for (const callback of callbacks) {
                        callback(e);
                    }
                }
                registry.add({
                    options: { ...defaultOptions, ...options },
                    callbacks,
                    handler,
                    originalOptions: Object.assign({}, options),
                });
                if (options.signal) {
                    options.signal.addEventListener("abort", () => {
                        this.unregister(callback);
                    }, { once: true });
                }
                document.addEventListener("click", handler, options);
            }
        },
        /**
         * Unregisters a callback so that it no longer receives click events.
         *
         * @param {Function} callback - The function to be removed from the event listeners.
         */
        unregister(callback) {
            for (const entry of registry) {
                const { callbacks, handler, originalOptions } = entry;
                if (callbacks.has(callback)) {
                    callbacks.delete(callback);
                    if (callbacks.size === 0) {
                        registry.delete(entry);
                        document.removeEventListener("click", handler, originalOptions);
                    }
                    break;
                }
            }
        }
    };
})();

/**
 * Logs a debug message to the console with the specified text color.
 *
 * @param {string} message - The message to be logged in the console.
 * @param {string} color - The CSS color value to apply to the message (e.g., "red", "#ff0000").
 */
export function consoleDebugColor(message, color) {
    console.debug(`%c${message}`, `color:${color}`);
}