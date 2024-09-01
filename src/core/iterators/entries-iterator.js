"use strict";

export class EntriesIterator {
    constructor(value) {
        if (typeof value !== "object" || value === null) {
            throw new TypeError("Given value must be an object")
        }
        this.value = value;
        this.arrayIterator = "entries" in value.constructor.prototype
            ? value.entries()
            : Object.entries(value);
    }
    *[Symbol.iterator]() {
        for (const [key, value] of this.arrayIterator) {
            yield [key, value];
        }
    }
}