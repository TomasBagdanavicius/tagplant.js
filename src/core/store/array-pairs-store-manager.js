"use strict";

import { arrayElementInsert } from "../functions/array.js";
import { isNullish } from "../functions/misc.js";
import { DeleteByKeyMixin } from "./store-manager.js";

export function arrayPairsDeleteByKey(array, key) {
    let index = 0;
    for (const [itemKey] of array) {
        if (itemKey === key) {
            const deletedElements = array.splice(index, 1);
            if (deletedElements.length !== 0) {
                return true;
            } else {
                return null;
            }
        }
        index++;
    }
    return null;
}

export class ArrayPairsStoreManager extends DeleteByKeyMixin(arrayPairsDeleteByKey) {
    #dispatchAddEvent;
    constructor(array) {
        if (!isNullish(array) && !Array.isArray(array)) {
            console.error("Parameter #1 must be an array");
        }
        if (!array) {
            array = [];
        }
        const protectedMethods = {};
        super(array, { protectedMethods });
        this.#dispatchAddEvent = protectedMethods.dispatchAddEvent;
    }
    *[Symbol.iterator]() {
        for (const data of this.store.values()) {
            yield data;
        }
    }
    get size() {
        return this.store.length;
    }
    hasKey(key) {
        for (const [itemKey] of this.store) {
            if (itemKey === key) {
                return true;
            }
        }
        return false;
    }
    add(element, key, { position = -1 } = {}) {
        if (!this.hasKey(key)) {
            arrayElementInsert(this.store, [key, element], { position });
            this.#dispatchAddEvent(element, { key, position });
        } else {
            throw new DOMException(
                `Could not add element, because the associated key "${key}" is taken`,
                "DuplicateError"
            );
        }
    }
}