"use strict";

import { arrayGetLastElement } from "../functions/array.js";
import { iterableSearchMarked, promiseSeries, validateVarInterface, sleep } from "../functions/misc.js";
import { EntriesIterator } from "../iterators/entries-iterator.js";
import { IndexedDatabase } from "./indexed-database.js";

/**
 * Database manager class.
 */
export class IndexedDatabaseManager {
    #database;
    #openRequestsCount = 0;
    /**
     * Creates an instance of DatabaseManager.
     * @param {IndexedDatabase} database - The database instance.
     */
    constructor(database) {
        validateVarInterface(database, IndexedDatabase);
        this.#database = database;
    }
    /**
     * Gets the database instance.
     * @returns {IndexedDatabase} The database instance.
     */
    get database() {
        return this.#database;
    }
    get openRequestsCount() {
        return this.#openRequestsCount;
    }
    async performRoutine(tasks, { signal, returnLast = false } = {}) {
        try {
            this.#openRequestsCount++;
            const values = await promiseSeries(tasks, { signal });
            if (!returnLast) {
                return values;
            } else {
                return arrayGetLastElement(values);
            }
        } finally {
            this.#openRequestsCount--;
            if (this.#openRequestsCount === 0) {
                this.database.close();
            }
        }
    }
    upgradeTasksList(list, { includeClose = true, throttle = false } = {}) {
        if (throttle) {
            list.unshift(() => sleep(throttle));
        }
        list.unshift(() => this.database.openIfClosed());
        if (includeClose) {
            list.push(() => this.database.close());
        }
        return list;
    }
    getSaveValueTasks(storeName, key, value, { includeClose = true, throttle = false } = {}) {
        return this.upgradeTasksList([
            () => this.database.putRecord(storeName, key, value)
        ], { includeClose, throttle });
    }
    async saveValue(storeName, key, value, { signal, throttle = false } = {}) {
        return this.performRoutine(this.getSaveValueTasks(storeName, key, value, { includeClose: false, throttle }), { signal });
    }
    getReadValueTasks(storeName, key, { includeClose = true } = {}) {
        return this.upgradeTasksList([
            () => this.database.getRecord(storeName, key)
        ], { includeClose });
    }
    async readValue(storeName, key, { signal } = {}) {
        return this.performRoutine(this.getReadValueTasks(storeName, key, { includeClose: false }), { signal, returnLast: true });
    }
    getDeleteRecordTasks(storeName, keyValue, { includeClose = true, checkExistence = false } = {}) {
        return this.upgradeTasksList([
            () => this.database.deleteRecord(storeName, keyValue, { checkExistence })
        ], { includeClose });
    }
    async deleteRecord(storeName, keyValue, { signal, checkExistence = false } = {}) {
        return this.performRoutine(this.getDeleteRecordTasks(storeName, keyValue, { includeClose: false, checkExistence }), { signal });
    }
    getDeleteMultipleRecordsTasks(storeName, keys, { includeClose = true, checkExistence = false, rejectOnFirstError } = {}) {
        return this.upgradeTasksList([
            () => this.database.deleteMultipleRecords(storeName, keys, { checkExistence, rejectOnFirstError })
        ], { includeClose });
    }
    async deleteMultipleRecords(storeName, keys, { signal, checkExistence = false, rejectOnFirstError } = {}) {
        return this.performRoutine(this.getDeleteMultipleRecordsTasks(storeName, keys, { includeClose: false, checkExistence, rejectOnFirstError }), { signal, returnLast: true });
    }
    getRecordsTasks(storeName, { callback, sort, order, offset, limit, returnPairs, includeClose = true } = {}) {
        return this.upgradeTasksList([
            () => this.database.records(storeName, { callback, sort, order, offset, limit, returnPairs })
        ], { includeClose });
    }
    async records(storeName, { callback, sort, order, offset, limit, returnPairs, signal } = {}) {
        const tasks = this.getRecordsTasks(storeName, { callback, sort, order, offset, limit, returnPairs, includeClose: false });
        return this.performRoutine(tasks, { signal, returnLast: true });
    }
    getRecordsWithSearchTermTasks(storeName, searchTerm, { caseInsensitive = true, accentInsensitive = true, returnPairs, includeClose = true } = {}) {
        const callback = (record, keyPath, pairs) => {
            const iterable = new EntriesIterator(record);
            const [element, foundCount] = iterableSearchMarked(iterable, searchTerm, { keepOriginal: true, caseInsensitive, accentInsensitive });
            if (foundCount === 0) {
                return false;
            } else {
                let result;
                if (pairs) {
                    const keyValue = element[keyPath];
                    const key = typeof keyValue === "object" && Object.hasOwn(keyValue, "rawValue") ? keyValue.rawValue : keyValue;
                    result = [key, element];
                } else {
                    result = element;
                }
                return result;
            }
        }
        return this.upgradeTasksList([
            () => this.database.records(storeName, { callback, returnCallbackValue: true, returnPairs })
        ], { includeClose });
    }
    async recordsWithSearchTerm(storeName, searchTerm, { caseInsensitive = true, accentInsensitive = true, returnPairs, signal } = {}) {
        const tasks = this.getRecordsWithSearchTermTasks(storeName, searchTerm, { caseInsensitive, accentInsensitive, returnPairs, includeClose: false });
        return this.performRoutine(tasks, { signal, returnLast: true });
    }
    getRecordCountTasks(storeName, { includeClose = true } = {}) {
        return this.upgradeTasksList([
            () => this.database.recordCount(storeName)
        ], { includeClose });
    }
    async recordCount(storeName, { signal } = {}) {
        const tasks = this.getRecordCountTasks(storeName);
        const [, count] = await this.performRoutine(tasks, { signal });
        return count;
    }
    getKeyPathTasks(storeName, { includeClose = true } = {}) {
        return this.upgradeTasksList([
            () => this.database.getKeyPath(storeName)
        ], { includeClose });
    }
    async keyPath(storeName, { signal } = {}) {
        const tasks = this.getKeyPathTasks(storeName);
        const [, keyPath] = await this.performRoutine(tasks, { signal });
        return keyPath;
    }
}