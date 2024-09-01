"use strict";

import { validateVarInterface } from "../functions/misc.js";

export class IDMappedCollection {
    #map = new Map;
    #elementConstructor;
    constructor(constructor) {
        this.#elementConstructor = constructor;
    }
    get size() {
        return this.#map.size;
    }
    get elementConstructor() {
        return this.#elementConstructor;
    }
    get(id) {
        if (typeof id !== "number" || Number.isNaN(id)) {
            throw new TypeError("ID must be a number");
        }
        return this.#map.get(id);
    }
    has(id) {
        return this.#map.has(id);
    }
    add(element) {
        validateVarInterface(element, this.#elementConstructor);
        if (this.has(element.id)) {
            throw new DOMException(`Element with ID ${element.id} already exists`, "DuplicateError");
        }
        this.#map.set(element.id, element);
    }
    remove(id) {
        return this.#map.delete(id);
    }
    empty() {
        this.#map.clear();
    }
    import(collection) {
        for (const component of collection) {
            validateVarInterface(component, this.#elementConstructor);
            this.add(component);
        }
    }
    filterByProperty(propertyName, value) {
        const result = new this.constructor;
        for (const element of this) {
            if (propertyName in element && element[propertyName] === value) {
                result.add(element);
            }
        }
        return result;
    }
    findFirstByProperty(propertyName, value) {
        for (const element of this) {
            if (propertyName in element && element[propertyName] === value) {
                return element;
            }
        }
        return null;
    }
    findFirstByCallback(callback) {
        for (const element of this) {
            if (callback(element)) {
                return element;
            }
        }
        return null;
    }
    *[Symbol.iterator]() {
        for (const value of this.#map.values()) {
            yield value;
        }
    }
}