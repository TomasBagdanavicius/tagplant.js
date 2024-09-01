"use strict";

import { sortDirection, validateEnumMember } from "../functions/enumeration.js";

export class IndexedDatabase {
    #name;
    #isOpen;
    #db;
    constructor(name, schema, versionNumber = 1) {
        this.#name = name;
        this.schema = schema;
        this.versionNumber = versionNumber;
        this.#isOpen = false;
    }
    get name() {
        return this.#name;
    }
    get isOpen() {
        return this.#isOpen;
    }
    open() {
        return new Promise((resolve, reject) => {
            if (this.#isOpen) {
                resolve();
            }
            const openRequest = indexedDB.open(this.#name, this.versionNumber);
            openRequest.onsuccess = () => {
                this.#db = openRequest.result;
                this.#isOpen = true;
                resolve();
            };
            openRequest.onerror = e => {
                console.error(e.error);
                reject(e.error);
            };
            openRequest.onupgradeneeded = e => {
                this.#db = openRequest.result;
                this.upgrade(e.target.transaction, e.oldVersion, e.newVersion);
            };
        });
    }
    async openIfClosed() {
        if (!this.#isOpen) {
            await this.open();
        }
    }
    upgrade(transaction) {
        // console.debug(`Indexed DB upgrade from ${oldVersion} to ${newVersion}`);
        for( const [storeName, indexes] of Object.entries(this.schema) ) {
            const indexNames = Object.keys(indexes);
            const options = { keyPath: indexNames[0] };
            if (
                Object.hasOwn(indexes[indexNames[0]], "autoIncrement")
                && indexes[indexNames[0]].autoIncrement === true
            ) {
                options.autoIncrement = true;
            }
            delete indexes[indexNames[0]];
            // Store does not exist
            if (!this.#db.objectStoreNames.contains(storeName)) {
                const objectStore = this.#db.createObjectStore(storeName, options);
                for( const [indexName, opts] of Object.entries(indexes) ) {
                    objectStore.createIndex(indexName, indexName, opts);
                }
            // Store already exists
            } else {
                const objectStore = transaction.objectStore(storeName);
                for( const [indexName, opts] of Object.entries(indexes) ) {
                    // Index name does not exist
                    if (!objectStore.indexNames.contains(indexName)) {
                        objectStore.createIndex(indexName, indexName, opts);
                    }
                }
            }
        }
    }
    putRecord(storeName, key, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.#db.transaction(storeName, "readwrite");
            const objectStore = transaction.objectStore(storeName);
            if (key !== undefined) {
                data[objectStore.keyPath] = key;
            }
            const objectStoreRequest = objectStore.put(data);
            objectStoreRequest.onsuccess = () => {
                resolve();
            };
            objectStoreRequest.onerror = e => {
                reject(e.target.error);
            };
        });
    }
    getRecord(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.#db.transaction(storeName, "readonly");
            const objectStore = transaction.objectStore(storeName);
            const getRequest = objectStore.get(key);
            getRequest.onsuccess = e => {
                const record = e.target.result;
                if (record) {
                    resolve(record);
                // Record not found
                } else {
                    // Null value implies that record was not found
                    resolve(null);
                }
            };
            getRequest.onerror = e => {
                reject(e.target.error);
            };
        });
    }
    deleteRecord(storeName, key, { checkExistence = false } = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.#db.transaction(storeName, "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const deleteAction = () => {
                const deleteRequest = objectStore.delete(key);
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => reject(deleteRequest.error);
            }
            if (!checkExistence) {
                deleteAction();
            } else {
                const getRequest = objectStore.get(key);
                getRequest.onsuccess = e => {
                    if (e.target.result) {
                        deleteAction();
                    // Record not found
                    } else {
                        reject(new DOMException(`Record was not found using key "${key}"`, "NotFound"));
                    }
                };
                getRequest.onerror = e => reject(e.target.error);
            }
        });
    }
    deleteMultipleRecords(storeName, keys, { checkExistence = false, rejectOnFirstError = true } = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.#db.transaction(storeName, "readwrite");
            const objectStore = transaction.objectStore(storeName);
            const successKeys = [];
            const errors = [];
            const notFoundKeys = [];
            let successCount = 0;
            let errorCount = 0;
            const deletePromises = keys.map(key => {
                return new Promise((resolve, reject) => {
                    const deleteAction = () => {
                        const deleteRequest = objectStore.delete(key);
                        deleteRequest.onsuccess = () => {
                            successCount++;
                            successKeys.push(key);
                            resolve();
                        }
                        deleteRequest.onerror = () => {
                            errorCount++;
                            errors.push([key, deleteRequest.error]);
                            reject(deleteRequest.error);
                        }
                    }
                    if (!checkExistence) {
                        deleteAction();
                    } else {
                        const getRequest = objectStore.get(key);
                        getRequest.onsuccess = e => {
                            if (e.target.result) {
                                deleteAction();
                            // Record not found
                            } else {
                                notFoundKeys.push(key);
                                resolve();
                            }
                        };
                        getRequest.onerror = e => reject(e.target.error);
                    }
                });
            });
            const handlePromises = rejectOnFirstError
                ? Promise.all(deletePromises)
                : Promise.allSettled(deletePromises);
            handlePromises
                .then(() => {
                    resolve({ successKeys, errors, successCount, errorCount, notFoundKeys });
                })
                .catch(error => {
                    reject(error);
                });
        });
    }
    close() {
        if (this.#isOpen) {
            this.#db.close();
            this.#isOpen = false;
        }
    }
    delete() {
        return new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(this.#name);
            deleteRequest.onsuccess = () => {
                resolve();
            };
            deleteRequest.onerror = () => {
                reject();
            };
        });
    }
    records(storeName, { callback, sort, order = sortDirection.asc, offset = 0, limit = -1, returnCallbackValue = false, returnPairs = true } = {}) {
        if (order) {
            validateEnumMember(order, "sortDirection");
        }
        const transaction = this.#db.transaction(storeName, "readonly");
        const objectStore = transaction.objectStore(storeName);
        let api;
        const direction = order === sortDirection.asc ? "next" : "prev";
        // If sort index is the key path, no need to open a named index
        if (sort && sort !== objectStore.keyPath) {
            api = objectStore.index(sort);
        } else {
            api = objectStore;
        }
        const IdbRequest = api.openCursor(null, direction);
        let cursor;
        let index = 0;
        let count = 0;
        const hasCallback = typeof callback === "function";
        return {
            next() {
                return new Promise((resolve, reject) => {
                    // Run `continue` only once the second or later iteration is reached.
                    if (cursor) {
                        // `continue` is outside `onsuccess` to prevent unlimited phantom calls to `onsuccess` once async iterator has returned.
                        cursor.continue();
                    }
                    IdbRequest.onsuccess = e => {
                        cursor = e.target.result;
                        if (cursor && (limit < 0 || limit > count)) {
                            index++;
                            if (offset && index === 1) {
                                cursor.advance(Math.max(0, offset));
                            } else {
                                count++;
                                const record = cursor.value;
                                let callbackValue;
                                if (hasCallback && !(callbackValue = callback(record, objectStore.keyPath, returnPairs))) {
                                    cursor.continue();
                                } else if (hasCallback && returnCallbackValue) {
                                    resolve({ value: callbackValue, done: false });
                                } else {
                                    let value;
                                    if (returnPairs) {
                                        const key = record[objectStore.keyPath];
                                        value = [key, record];
                                    } else {
                                        value = record;
                                    }
                                    resolve({ value, done: false });
                                }
                            }
                        } else {
                            resolve({ value: undefined, done: true });
                        }
                    };
                    IdbRequest.onerror = e => {
                        reject(e.target.error);
                    };
                });
            },
            // This will be reached if the consumer called "break" or "return" early in the loop.
            return() {
                return { done: true };
            },
            [Symbol.asyncIterator]() {
                return this;
            }
        }
    }
    recordCount(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.#db.transaction(storeName, "readonly");
            const objectStore = transaction.objectStore(storeName);
            const countRequest = objectStore.count();
            countRequest.onsuccess = () => {
                resolve(countRequest.result);
            };
            countRequest.onerror = () => {
                reject(countRequest.error);
            };
        });
    }
    getKeyPath(storeName) {
        const transaction = this.#db.transaction(storeName, "readonly");
        const objectStore = transaction.objectStore(storeName);
        return objectStore.keyPath;
    }
}