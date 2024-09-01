"use strict";

/**
 * Checks if a given number is even.
 *
 * @param {number} number - The number to check for evenness.
 * @returns {boolean} Returns true if the number is even, false otherwise.
 */
export function isEven(number) {
    return number % 2 === 0;
}

/**
 * Checks if a given number is odd.
 *
 * @param {number} number - The number to check for oddness.
 * @returns {boolean} Returns true if the number is odd, false otherwise.
 */
export function isOdd(number) {
    return number % 2 !== 0;
}

/**
 * Creates an array of numbers in a specified range.
 *
 * @param {number} start - The starting number of the range (inclusive).
 * @param {number} end - The ending number of the range (inclusive).
 * @returns {number[]} An array containing the numbers in the specified range.
 */
export function numberRange(start, end) {
    const numbers = [];
    for (let i = start; i <= end; i++) {
        numbers.push(i);
    }
    return numbers;
}

/**
 * Generates a random integer between two given numbers (inclusive).
 *
 * @param {number} min - The minimum value of the range.
 * @param {number} max - The maximum value of the range.
 * @returns {number} A random integer between min and max (inclusive).
 */
export function randomBetweenTwoNumbers(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Finds the nearest larger value that is a multiple of the specified step.
 * @param {number} originalValue - The original value.
 * @param {number} step - The step value.
 * @returns {number} The nearest larger value that is a multiple of the step.
 */
export function findNearestLargerStepValue(originalValue, step) {
    const remainder = originalValue % step;
    if (remainder === 0) {
        // Round up to the next multiple of the step
        return originalValue + step;
    } else {
        // Round up to the next multiple of the step
        const closestMultiple = Math.ceil(originalValue / step) * step;
        return parseFloat(closestMultiple.toFixed(10)); // Adjust the number of decimal places as needed
    }
}

/**
 * Finds the nearest smaller value that is a multiple of the specified step.
 * @param {number} originalValue - The original value.
 * @param {number} step - The step value.
 * @returns {number} The nearest smaller value that is a multiple of the step.
 */
export function findNearestSmallerStepValue(originalValue, step) {
    const remainder = originalValue % step;
    if (remainder === 0) {
        // Round up to the next multiple of the step
        return originalValue - (step - remainder);
    } else {
        // Round up to the next multiple of the step
        const closestMultiple = Math.floor(originalValue / step) * step;
        return parseFloat(closestMultiple.toFixed(10)); // Adjust the number of decimal places as needed
    }
}

/**
 * Creates a numeric sorter function for sorting an array of objects by a numeric property.
 *
 * @param {string} [name="position"] - The name of the numeric property to sort by.
 * @returns {function} A comparator function that can be used with Array.prototype.sort().
 */
export const numericElementSorter = (name = "position") => {
    /**
     * Comparator function to sort objects by the specified numeric property.
     *
     * @param {Object} a - The first object to compare.
     * @param {Object} b - The second object to compare.
     * @returns {number} A negative number if a should come before b, a positive number if b should come before a, or 0 if they are equal.
     */
    return (a, b) => (a[name] || 0) - (b[name] || 0);
}