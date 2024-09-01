"use strict";

/**
 * Create a custom iterator that applies a callback function to each value in an iterable.
 *
 * @param {Iterable} iterable - The iterable to iterate through.
 * @param {Function} callback - The callback function to apply to each value.
 * @returns {Iterable} An iterable with the modified values.
 */
export function callbackIterator(iterable, callback) {
    if (typeof callback !== "function") {
        throw new TypeError("Callback must be a function");
    }
    return {
        [Symbol.iterator]() {
            // Inner iterator
            const iterator = iterable[Symbol.iterator]();
            return {
                /**
                 * Get the next modified value from the iterable.
                 *
                 * @returns {{ value: any, done: boolean }} An object with the modified value and a flag indicating if the iteration is complete.
                 */
                next: () => {
                    const { value, done } = iterator.next();
                    if (done) {
                        return { done: true };
                    }
                    const changedValue = callback(value);
                    return { value: changedValue, done: false };
                },
            };
        },
    };
}