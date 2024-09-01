"use strict";

import { getArraySorter } from "../functions/array.js";
import { wrapSubstringsWithElement } from "../functions/string.js";
import { getItemsSorter } from "../functions/object.js";
import { isNullish, validateVarInterface } from "../functions/misc.js";
import { sortDirection } from "../functions/enumeration.js";
import { PagingCalculator } from "../calculators/paging-calculator.js";
import { EntriesIterator } from "../iterators/entries-iterator.js";

export function filterElement(element, search, { keepOriginal = false } = {}) {
    if (!search) {
        return element;
    }
    if (isNullish(element)) {
        return null;
    }
    if (typeof element === "string") {
        const result = wrapSubstringsWithElement(element, search, "mark", true, true);
        // Found
        if (result instanceof DocumentFragment) {
            return result;
        } else {
            return null;
        }
    } else if ("trackCriteria" in element) {
        const controller = element.trackCriteria({ search });
        if (controller.isMatch) {
            return element;
        } else {
            return null;
        }
    } else {
        if ("toItem" in element) {
            element = element.toItem();
        }
        let foundCount = 0;
        const modifiedElement = Object.create(null);
        for (let [name, value] of new EntriesIterator(element)) {
            const rawValue = value;
            const valueType = typeof value;
            if (valueType === "string" || valueType === "number") {
                value = String(value);
                const result = wrapSubstringsWithElement(value, search, "mark", true, true);
                // Found
                if (result instanceof DocumentFragment) {
                    if (!keepOriginal) {
                        modifiedElement[name] = result;
                    } else {
                        modifiedElement[name] = { rawValue, value: result }
                    }
                    foundCount++;
                }
            }
            if (!(name in modifiedElement)) {
                modifiedElement[name] = rawValue;
            }
        }
        if (foundCount === 0) {
            return null;
        }
        return modifiedElement;
    }
}

export class StoreManager extends EventTarget {
    #store;
    constructor(store, { protectedMethods = {} } = {}) {
        super(store);
        this.#store = store;
        Object.assign(protectedMethods, {
            dispatchAddEvent: this.#dispatchAddEvent,
            dispatchDeleteEvent: this.#dispatchDeleteEvent,
            dispatchDeleteManyEvent: this.#dispatchDeleteManyEvent,
            dispatchDeleteNotFoundEvent: this.#dispatchDeleteNotFoundEvent
        });
    }
    *[Symbol.iterator]() {
        for (const [index, value] of this.store.entries()) {
            yield [index, value];
        }
    }
    get store() {
        return this.#store;
    }
    get size() {
        return this.store.size;
    }
    /* Whether removing an element requires shifting the indexes of subsequent elements to maintain the order. */
    get isDense() {
        // Default value
        return false;
    }
    getSize() {
        return this.size;
    }
    applySearchParams(params, { appliedParams = {} } = {}) {
        let result = [];
        let isItems;
        let itemizedKeyPath;
        const itemizedElements = new Map;
        const registerItemizedElement = element => {
            itemizedKeyPath = element.keyPath;
            const key = element[itemizedKeyPath];
            itemizedElements.set(key, element);
            return [key, element.toItem()];
        }
        for (const [key, element] of this) {
            const elementType = typeof element;
            if (params.search) {
                const searchResult = filterElement(element, params.search, {
                    keepOriginal: true
                });
                if (searchResult !== null) {
                    if (searchResult instanceof DocumentFragment) {
                        result.push([key, { result: searchResult, value: element }]);
                    } else if ("toItem" in element) {
                        result.push(registerItemizedElement(element));
                    } else {
                        result.push([key, searchResult]);
                    }
                }
                appliedParams.search = params.search;
            } else {
                if (elementType === "object" && "toItem" in element) {
                    result.push(registerItemizedElement(element));
                } else {
                    result.push([key, element]);
                }
            }
            if (isItems === undefined && elementType === "object") {
                isItems = true;
            }
        }
        const total = result.length;
        // Search did not yield any results
        if (total === 0) {
            return { result, total, appliedParams };
        }
        let offsetStart = 0;
        let pagingCalculator;
        if (params.perPage && params.page) {
            pagingCalculator = new PagingCalculator({
                total,
                perPage: params.perPage,
                page: PagingCalculator.getLastPageIfMax(params.page, total, params.perPage)
            });
            offsetStart = pagingCalculator.offsetStart;
            // Out of page bounds
            if (offsetStart >= total) {
                return { result: [], total, appliedParams };
            }
        }
        if (params.order) {
            let sorter;
            if (!isItems) {
                if (params.order === "asc" || params.order === "desc") {
                    const direction = params.order.toLowerCase();
                    sorter = getArraySorter({
                        direction: sortDirection[direction],
                        path: "rawValue",
                        isPairs: true
                    });
                }
            } else if (params.sort) {
                console.log("this sorter");
                sorter = getItemsSorter({
                    sortCriteria: `${params.sort} ${params.order.toUpperCase()}`,
                    path: "rawValue",
                    isPairs: true,
                });
            }
            if (sorter) {
                console.log(result);
                result.sort(sorter);
                appliedParams.order = params.order;
                if (params.sort) {
                    appliedParams.sort = params.sort;
                }
            }
        }
        if (pagingCalculator) {
            const offsetEnd = pagingCalculator.offsetEnd;
            if (offsetStart !== 0 || offsetEnd < total) {
                result = result.slice(offsetStart, offsetEnd);
            }
            appliedParams.perPage = params.perPage;
            appliedParams.page = params.page;
        }
        if (itemizedElements.size !== 0) {
            for (const [index, [, item]] of result.entries()) {
                result[index][1] = itemizedElements.get(item[itemizedKeyPath]);
            }
        }
        return { result, total, appliedParams };
    }
    #dispatchAddEvent(element, details = {}) {
        this.dispatchEvent(new CustomEvent("add", {
            detail: { ...details, element }
        }));
    }
    #dispatchDeleteEvent(key, details = {}) {
        this.dispatchEvent(new CustomEvent("delete", {
            detail: { ...details, key }
        }));
    }
    #dispatchDeleteManyEvent(keys, details = {}) {
        this.dispatchEvent(new CustomEvent("deletemany", {
            detail: { ...details, keys }
        }));
    }
    #dispatchDeleteNotFoundEvent(keys, details = {}) {
        this.dispatchEvent(new CustomEvent("deletenotfound", {
            detail: { ...details, keys }
        }));
    }
}

export const DeleteByKeyMixin = (deleteMethod, { parentConstructor = StoreManager } = {}) => {
    return class extends parentConstructor {
        #dispatchDeleteEvent;
        #dispatchDeleteManyEvent;
        constructor(...args) {
            super(...args);
            const { dispatchDeleteEvent, dispatchDeleteManyEvent } = args[1].protectedMethods;
            this.#dispatchDeleteEvent = dispatchDeleteEvent;
            this.#dispatchDeleteManyEvent = dispatchDeleteManyEvent;
        }
        delete(key, { reason } = {}) {
            const result = deleteMethod(this.store, key);
            if (result) {
                this.#dispatchDeleteEvent(key, { total: this.getSize(), reason });
            }
            return result;
        }
        deleteMany(keys, { reason } = {}) {
            const info = {
                successKeys: [],
                errors: [],
                successCount: 0,
                errorCount: 0,
                notFoundKeys: []
            };
            for (const key of keys) {
                const result = deleteMethod(this.store, key);
                if (result) {
                    info.successKeys.push(key);
                    info.successCount++;
                } else if (result === null) {
                    info.notFoundKeys.push(key);
                } else {
                    info.errors.push([key, new DOMException("Could not delete element")]);
                    info.errorCount++;
                }
            }
            if (info.successCount !== 0) {
                this.#dispatchDeleteManyEvent(info.successKeys, { total: this.getSize(), reason });
            }
            return info;
        }
    }
}

export function collectionDeleteByKey(collection, key) {
    validateVarInterface(collection, [Map, Set]);
    const result = collection.delete(key);
    // `delete` returns `false` if the element does not exist
    if (!result) {
        return null;
    }
    return result;
}