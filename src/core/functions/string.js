"use strict";

import { validateVarInterface } from "./misc.js";

/**
 * Escapes special characters in a regular expression pattern.
 *
 * @param {string} str - The input string to escape.
 * @returns {string} The escaped string with special characters replaced.
 */
export function escapeRegExp(str) {
    // "$&" means the whole matched string
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Removes trailing occurrences of specified characters from the input string.
 *
 * @param {string} str - The input string to be trimmed.
 * @param {string} chars - A string containing the characters to remove.
 * @returns {string} The trimmed string.
 */
export function trimEndChars(str, chars) {
    return str.replace(new RegExp('[' + escapeRegExp(chars) + ']*$', 'g'), '');
}

/**
 * Removes leading occurrences of specified characters from the input string.
 *
 * @param {string} str - The input string to be trimmed.
 * @param {string} chars - A string containing the characters to remove.
 * @returns {string} The trimmed string.
 */
export function trimStartChars(str, chars) {
    return str.replace(new RegExp('^[' + escapeRegExp(chars) + ']*', 'g'), '');
}

/**
 * Removes leading and trailing occurrences of specified characters from the input string.
 *
 * @param {string} str - The input string to be trimmed.
 * @param {string} chars - A string containing the characters to remove.
 * @returns {string} The trimmed string.
 */
export function trimChars(str, chars) {
    return trimStartChars(trimEndChars(str, chars), chars);
}

/**
 * Normalizes a string by transliterating all non-latin characters to latin
 * @param {string} string - The string to be normalized
 * @returns {string}
 */
export function stringTransliterateToLatin(string) {
    return string.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Inserts a substring into a string at the given index position
 * @param {string} string - The string where the substring will be inserted into
 * @param {number} index - Index position
 * @param {string} substring - The substring to be inserted
 * @returns {string}
 */
export function stringInsertAt(string, index, substring) {
    if (isNaN(index)) {
        index = 0;
    }
    return string.slice(0, index).concat(
        substring,
        string.slice(index)
    );
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param {string} string - The input string.
 * @returns {string} A new string with the first letter capitalized.
 */
export function stringCapitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase().concat(string.slice(1));
}

/**
 * Generates a cryptographically secure random string of a specified length.
 *
 * @param {number} length - The length of the random string to generate.
 * @param {Object} options - An options object that specifies which character sets to include.
 * @param {boolean} [options.lowercaseLetters=true] - Include lowercase letters.
 * @param {boolean} [options.uppercaseLetters=true] - Include uppercase letters.
 * @param {boolean} [options.digits=true] - Include digits.
 * @param {boolean} [options.specialChars=true] - Include special characters.
 * @returns {string} A random string of the specified length.
 * @throws {RangeError} Throws a RangeError if no character sets are included.
 */
export function generateRandomString(length, { lowercaseLetters = true, uppercaseLetters = true, digits = true, specialChars = true } = {}) {
    if (!lowercaseLetters && !uppercaseLetters && !digits && !specialChars) {
        throw new RangeError("At least one option must be truthy");
    }
    let charset = "";
    if (lowercaseLetters) {
        charset += "abcdefghijklmnopqrstuvwxyz";
    }
    if (uppercaseLetters) {
        charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    }
    if (digits) {
        charset += "0123456789";
    }
    if (specialChars) {
        charset += "!@#$%^&*()_";
    }
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    let result = [];
    for (let i = 0; i < length; i++) {
        result.push(charset[randomValues[i] % charset.length]);
    }
    return result.join("");
}

/**
 * Searches the entire calling string, and returns all index positions of the
 *     specified substring
 * @param {string} string - The calling string
 * @param {string} searchString - Substring to search for
 * @param {number} position - Starting index position
 * @returns {array} The index positions of all occurrences of searchString
 *     found, or an empty array if not found.
 */
export function stringIndexOfAll(string, searchString, position = 0) {
    let pos;
    const positions = [];
    if (searchString) {
        // Inline with `String.prototype.indexOf`: if position is less than zero,
        // the method behaves as if position were 0.
        position = Math.max(0, position);
        while ((pos = string.indexOf(searchString, position)) !== -1) {
            positions.push(pos);
            position = (pos + 1);
        }
    }
    return positions;
}

/**
 * Search for all occurrences of a substring in a string.
 *
 * @param {string} string - The string to search within.
 * @param {string} searchString - The substring to search for.
 * @param {boolean} [caseInsensitive=false] - Set to true for case-insensitive search.
 * @param {boolean} [accentInsensitive=false] - Set to true for accent-insensitive search.
 * @returns {number[]} An array of indices where the substring is found in the string.
 */
export function stringSearchAll(string, searchString, caseInsensitive = false, accentInsensitive = false) {
    if (accentInsensitive) {
        string = stringTransliterateToLatin(string);
        searchString = stringTransliterateToLatin(searchString);
    }
    if (caseInsensitive) {
        string = string.toLowerCase();
        searchString = searchString.toLowerCase();
    }
    return stringIndexOfAll(string, searchString);
}

/**
 * Adds given before and after strings around substrings at a given position
 *     in a string
 * @param {string} string - String which will be modified
 * @param {array} positions - Start index positions of the substrings
 * @param {number} substringLength - Substring length
 * @param {string} before - Before string that will be inserted at each start
 *     position
 * @param {string} after - After string that will be inserted at each start
 *     position plus substring length
 * @returns {string}
 */
export function substringsWrapByPosition(string, positions, substringLength, before, after) {
    let offset = 0;
    let index;
    positions.forEach(position => {
        index = (position + offset);
        string = stringInsertAt(string, index, before);
        offset += before.length;
        index = (position + offset + substringLength);
        string = stringInsertAt(string, index, after);
        offset += after.length;
    });
    return string;
}

/**
 * Searches for all occurences of a substring in a string and then adds given
 *     before and after strings around found substrings
 * @param {string} string - String where to search for substrings
 * @param {string} substring - String to be searched for
 * @param {string} before - Before string that will be inserted right before
 *     each found substring
 * @param {string} after - After string that will be inserted right after each
 *     found substring
 * @returns {string}
 */
export function wrapSubstringsWithString(string, substring, before, after, caseInsensitive = false, accentInsensitive = false) {
    const positions = stringSearchAll(string, substring, caseInsensitive, accentInsensitive);
    if (!positions.length) {
        return string;
    }
    return substringsWrapByPosition(
        // Normalize to prevent diacritic information loss
        string.normalize("NFC"),
        positions,
        substring.length,
        before,
        after
    );
}

/**
 * Wraps all occurrences of a substring within a string with an HTML element.
 *
 * @param {string} string - The original string.
 * @param {string} substring - The substring to wrap with the HTML element.
 * @param {string} [elName="span"] - The name of the HTML element to wrap the substring with (default: "span").
 * @param {boolean} [caseInsensitive=false] - Whether the search for substring should be case insensitive (default: false).
 * @param {boolean} [accentInsensitive=false] - Whether the search for substring should be accent insensitive (default: false).
 * @returns {DocumentFragment} A document fragment containing the modified string with wrapped substrings.
 */
export function wrapSubstringsWithElement(string, substring, elName = "span", caseInsensitive = false, accentInsensitive = false) {
    const positions = stringSearchAll(string, substring, caseInsensitive, accentInsensitive);
    if (!positions.length) {
        return string;
    }
    const len = substring.length;
    const docFragment = new DocumentFragment;
    let startIndex = 0;
    for (const pos of positions) {
        docFragment.append(document.createTextNode(string.substring(startIndex, pos)));
        const mark = document.createElement(elName);
        const endIndex = pos + len;
        mark.append(document.createTextNode(string.substring(pos, endIndex)));
        docFragment.append(mark);
        startIndex = endIndex;
    }
    if (startIndex !== string.length) {
        docFragment.append(document.createTextNode(string.substring(startIndex)));
    }
    return docFragment;
}

/**
 * Formats a counted string based on the count using singular and plural forms.
 * Optionally uses a template to format the string.
 *
 * @param {number} count - The count to determine singular or plural form.
 * @param {string} singular - The singular form of the string.
 * @param {string} plural - The plural form of the string.
 * @param {StringTemplate} template - Optional template for formatting the string.
 * @returns {string} Formatted counted string.
 */
export function formatCountedString(count, singular, plural, template) {
    const pluralRules = new Intl.PluralRules(document.documentElement.lang, { type: "cardinal" });
    const pluralCategory = pluralRules.select(count);
    const text = pluralCategory === "one" ? singular : plural;
    return (!(template instanceof StringTemplate))
        ? `${count} ${text}`
        : template.format({ count, text });
}

/**
 * Checks if a string contains HTML elements.
 *
 * @param {string} str - The string to check.
 * @returns {boolean} True if the string contains HTML elements, false otherwise.
 */
export function stringContainsHTML(str) {
    const el = document.createElement("div");
    el.innerHTML = str;
    return el.children.length !== 0;
}

/**
 * Retrieves the inner text content from a string containing HTML.
 *
 * @param {string} str - The string containing HTML.
 * @returns {string} The inner text content extracted from the HTML string.
 */
export function stringGetInnerText(str) {
    const el = document.createElement("div");
    el.innerHTML = str;
    return el.innerText;
}

/**
 * Checks if a string contains only numeric characters.
 *
 * @param {string} str - The string to check.
 * @returns {boolean} Returns true if the string contains only numeric characters, false otherwise.
 */
export function stringContainsNumbersOnly(str) {
    return /^\d+$/.test(str);
}

/**
 * Converts a camelCase string to kebab-case.
 *
 * @param {string} str - The camelCase string to convert.
 * @returns {string} The converted kebab-case string.
 */
export function camelCaseToKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Trims a sentence to a specified word limit.
 * Uses Intl.Segmenter to count words based on the provided locale.
 * Adds ellipsis (...) if the sentence is trimmed.
 *
 * @param {string} sentence - The sentence to trim.
 * @param {number} wordLimit - The maximum number of words to retain.
 * @param {string} [locale="en"] - The locale used for word segmentation (default is "en").
 * @returns {string} The trimmed sentence.
 */
export function trimSentence(sentence, wordLimit, locale = "en") {
    const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
    const segments = [...segmenter.segment(sentence)];
    let wordCount = 0;
    let resultSegments = [];
    for (const segment of segments) {
        if (segment.isWordLike) {
            wordCount++;
        }
        resultSegments.push(segment.segment);
        if (wordCount >= wordLimit) {
            break;
        }
    }
    // Combine segments and add ellipsis if the sentence was trimmed
    const result = resultSegments.join('');
    return wordCount >= wordLimit ? result.trim() + "..." : result.trim();
}

/**
 * Represents a template for formatting strings with placeholders.
 */
export class StringTemplate {
    /**
     * @param {object} options - The options for creating the StringTemplate.
     * @param {string[]} options.strings - Array of string segments from the template.
     * @param {string[]} options.keys - Array of keys corresponding to placeholders in the template.
     * @param {function} [options.formatter] - Optional formatter function for custom formatting.
     */
    constructor({ strings, keys, formatter }) {
        this.strings = strings;
        this.keys = keys;
        this.formatter = formatter;
    }
    /**
     * Formats the template with values from a dictionary.
     * @param {object} dictionary - The dictionary containing values for placeholders.
     * @returns {string} The formatted string.
     */
    format(dictionary) {
        if (!this.formatter) {
            return this.strings.reduce((result, value, index) => {
                const key = this.keys[index];
                return result.concat(value).concat(dictionary[key] ?? "");
            }, "");
        } else {
            return this.formatter(dictionary);
        }
    }
    /**
     * Creates a StringTemplate from a string using a regular expression to identify placeholders.
     * @param {string} str - The string containing placeholders.
     * @param {RegExp} regex - The regular expression to match placeholders.
     * @returns {StringTemplate} The created StringTemplate instance.
     */
    static fromString(str, regex) {
        validateVarInterface(regex, RegExp, { paramNumber: 2 });
        const keys = [];
        const strings = [];
        let match;
        let lastIndex = 0;
        while ((match = regex.exec(str)) !== null) {
            const placeholder = match[0];
            const index = match.index;
            if (index !== lastIndex) {
                strings.push(str.slice(lastIndex, index));
            }
            keys.push(match[1]);
            lastIndex = index + placeholder.length;
        }
        if (lastIndex < str.length) {
            strings.push(str.slice(lastIndex));
        }
        return new StringTemplate({ strings, keys });
    }
}

/**
 * Creates a StringTemplate instance.
 * @param {string[]} strings - Array of string segments from the template.
 * @param {...string} keys - Array of keys corresponding to placeholders in the template.
 * @returns {StringTemplate} The created StringTemplate instance.
 */
export function stringTemplate(strings, ...keys) {
    return new StringTemplate({ strings, keys });
}