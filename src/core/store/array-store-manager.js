"use strict";

import { arrayElementInsert } from "../functions/array.js";
import { isNullish } from "../functions/misc.js";
import { DeleteByKeyMixin } from "./store-manager.js";

export function arrayDeleteByKey(array, key) {
    // Does not allow negative numbers, because it's treated as key rather than a start number
    key = Math.max(key, 0);
    const deletedElements = array.splice(key, 1);
    if (deletedElements.length !== 0) {
        return true;
    } else {
        return null;
    }
}

export class ArrayStoreManager extends DeleteByKeyMixin(arrayDeleteByKey) {
    #dispatchAddEvent;
    #dispatchDeleteManyEvent;
    #dispatchDeleteNotFoundEvent;
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
        this.#dispatchDeleteManyEvent = protectedMethods.dispatchDeleteManyEvent;
        this.#dispatchDeleteNotFoundEvent = protectedMethods.dispatchDeleteNotFoundEvent;
    }
    get size() {
        return this.store.length;
    }
    get isDense() {
        return true;
    }
    hasKey(key) {
        return key in this.store;
    }
    add(element, { position = -1 } = {}) {
        arrayElementInsert(this.store, element, { position });
        this.#dispatchAddEvent(element, { position });
    }
    deleteMany(keys) {
        const info = {
            successKeys: [],
            errors: [],
            successCount: 0,
            errorCount: 0,
            notFoundKeys: []
        };
        const sortedKeys = keys.toSorted((a, b) => a - b);
        let offset = 0;
        for (const key of sortedKeys) {
            const result = arrayDeleteByKey(this.store, key - offset);
            if (result) {
                info.successKeys.push(key);
                info.successCount++;
                offset++;
            } else if (result === null) {
                info.notFoundKeys.push(key);
            } else {
                info.errors.push([key, new DOMException("Could not delete element")]);
                info.errorCount++;
            }
        }
        if (info.successCount !== 0) {
            this.#dispatchDeleteManyEvent(info.successKeys);
        }
        if (info.notFoundKeys.length !== 0) {
            this.#dispatchDeleteNotFoundEvent(info.notFoundKeys, { total: this.size });
        }
        return info;
    }
}