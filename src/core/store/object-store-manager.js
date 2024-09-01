"use strict";

import { validateVarInterface } from "../functions/misc.js";
import { DeleteByKeyMixin } from "./store-manager.js";

export function objectDeleteByKey(object, key) {
    if (key in object) {
        return delete object[key];
    } else {
        return null;
    }
}

export class ObjectStoreManager extends DeleteByKeyMixin(objectDeleteByKey) {
    #dispatchAddEvent;
    constructor(object) {
        validateVarInterface(object, Object, { allowUndefined: true });
        if (!object) {
            object = Object.create(null);
        }
        const protectedMethods = {};
        super(object, { protectedMethods });
        this.#dispatchAddEvent = protectedMethods.dispatchAddEvent;
    }
    *[Symbol.iterator]() {
        for (const [index, value] of Object.entries(this.store)) {
            yield [index, value];
        }
    }
    get size() {
        return Object.keys(this.store).length;
    }
    hasKey(key) {
        return Object.hasOwn(this.store, key);
    }
    add(element, key) {
        if (!this.hasKey(key)) {
            this.store[key] = element;
            this.#dispatchAddEvent(element, { key });
        } else {
            throw new DOMException(
                `Could not add element, because the associated key "${key}" is taken`,
                "DuplicateError"
            );
        }
    }
}