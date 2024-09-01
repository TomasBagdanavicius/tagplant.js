"use strict";

import { sortDirection, validateEnumMember } from "./enumeration.js";

/**
 * Returns a comparator function for sorting arrays based on specified options.
 *
 * @param {object} options - Options for sorting.
 * @param {string} [options.direction='asc'] - The direction of sorting ('asc' for ascending, 'desc' for descending).
 * @param {string} options.path - The property path to sort by when elements are objects.
 * @param {boolean} [options.isPairs=false] - Indicates if the arrays to be sorted are pairs.
 * @returns {Function} A comparator function for sorting arrays.
 * @throws {TypeError} If the direction is not a valid member of the sortDirection enum.
 */
export function getArraySorter({ direction = sortDirection.asc, path, isPairs = false } = {}) {
    validateEnumMember(direction, "sortDirection");
    return (a, b) => {
        if (isPairs && Array.isArray(a) && Array.isArray(b)) {
            a = a[1];
            b = b[1];
        }
        let first = direction === sortDirection.asc ? a : b;
        let second = direction === sortDirection.asc ? b : a;
        // Check if a and b are numbers
        if (!isNaN(a) && !isNaN(b)) {
            return first - second;
        } else {
            if (path && typeof first === "object" && typeof second === "object") {
                first = first[path] || first;
                second = second[path] || second;
            }
            // Convert both a and b to strings and compare using localeCompare for string comparison
            return String(first).localeCompare(String(second));
        }
    }
}

/**
 * Removes the specified element from the given array.
 *
 * @param {Array} array - The array from which to remove the element.
 * @param {*} element - The element to be removed from the array.
 * @returns {boolean|null} Returns `true` if the element was successfully removed and `null` if the array is empty.
 */
export function arrayElementRemove(array, element) {
    const index = array.indexOf(element);
    if (index === -1) {
        return null;
    }
    array.splice(index, 1);
    return true;
}

/**
 * Gets the last element of an array.
 *
 * @param {Array} array - The input array.
 * @returns {*} The last element of the array. If the array is empty, returns undefined.
 */
export function arrayGetLastElement(array) {
    if (array.length === 0) {
        return undefined;
    } else {
        return array[array.length - 1];
    }
}

/**
 * Checks if an array contains a specific element.
 *
 * @param {Array} array - The array to search.
 * @param {*} searchElement - The element to search for in the array.
 * @returns {boolean} Returns true if the element is found in the array, false otherwise.
 */
export function arrayContainsElement(array, searchElement) {
    if (array.length === 0) {
        return false;
    }
    for (const element of array) {
        if (element === searchElement) {
            return true;
        }
    }
    return false;
}

/**
 * Inserts a new element into an array at a specified position.
 *
 * @param {Array} array - The array to insert into.
 * @param {*} newElement - The new element to insert into the array.
 * @param {object} [options] - Options for inserting the element.
 * @param {number} [options.position=-1] - The position in the array to insert the new element. If negative, appends to the end of the array.
 */
export function arrayElementInsert(array, newElement, { position = -1 } = {}) {
    if (position < 0) {
        array.push(newElement);
    } else {
        array.splice(position, 0, newElement);
    }
}

/**
 * Returns the length of an array excluding empty or undefined slots.
 *
 * @param {Array} array - The array to calculate the length of.
 * @returns {number} The number of non-empty elements in the array.
 */
export function arrayLengthExcludingEmptySlots(array) {
    return array.reduce((count, element) => {
        if (element !== undefined) {
            return count + 1;
        } else {
            return count;
        }
    }, 0);
}

/**
 * Determines if two arrays contain the same values.
 *
 * @param {Array} array1 - The first array for comparison.
 * @param {Array} array2 - The second array for comparison.
 * @returns {boolean} Returns `true` if both arrays have the same values, `false` otherwise.
 */
export function twoArraysEqual(array1, array2) {
    if (array1.length === 0 && array2.length === 0) {
        return true;
    }
    if (array1.length !== array2.length) {
        return false;
    }
    return array1.every(value => array2.includes(value));
}

/**
 * Checks if two arrays are identical, meaning they have the same elements in the same order.
 *
 * @param {Array} array1 - The first array to compare.
 * @param {Array} array2 - The second array to compare.
 * @returns {boolean} Returns true if the arrays are identical, false otherwise.
 */
export function twoArraysIdentical(array1, array2) {
    return array1.length === array2.length
        && array1.every((value, index) => value === array2[index]);
}

/**
 * Checks if two arrays of pairs are equal, ignoring the order of pairs within each array.
 *
 * @param {Array} array1 - The first array of pairs to compare.
 * @param {Array} array2 - The second array of pairs to compare.
 * @returns {boolean} Returns true if the arrays are equal, false otherwise.
 */
export function twoPairArraysEqual(array1, array2) {
    const sortedArray1 = array1.slice().sort();
    const sortedArray2 = array2.slice().sort();
    if (sortedArray1.length !== sortedArray2.length) {
        return false;
    }
    for (let i = 0; i < sortedArray1.length; i++) {
        const pair1 = sortedArray1[i];
        const pair2 = sortedArray2[i];
        if (pair1[0] !== pair2[0] || pair1[1] !== pair2[1]) {
            return false;
        }
    }
    return true;
}