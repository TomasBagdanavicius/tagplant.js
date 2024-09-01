"use strict";

import { isNullish } from "../functions/misc.js";
import { PagingCalculator } from "../calculators/paging-calculator.js";
import { TaskPerformApplicationException } from "../exceptions.js";
import { StoreManager } from "./store-manager.js";
import { getItemsSorter } from "../functions/object.js";

export class IndexedDBStoreManager extends StoreManager {
    #storeName;
    #dispatchAddEvent;
    #dispatchDeleteEvent;
    #dispatchDeleteManyEvent;
    #dispatchDeleteNotFoundEvent;
    constructor(databaseManager, storeName) {
        const protectedMethods = {};
        super(databaseManager, { protectedMethods });
        this.#dispatchAddEvent = protectedMethods.dispatchAddEvent;
        this.#dispatchDeleteEvent = protectedMethods.dispatchDeleteEvent;
        this.#dispatchDeleteManyEvent = protectedMethods.dispatchDeleteManyEvent;
        this.#dispatchDeleteNotFoundEvent = protectedMethods.dispatchDeleteNotFoundEvent;
        this.#storeName = storeName;
    }
    async *[Symbol.asyncIterator]() {
        const records = await this.store.records(this.#storeName, { returnPairs: true });
        for await (const data of records) {
            yield data;
        }
    }
    get size() {
        return this.getSize();
    }
    async getSize() {
        return await this.store.recordCount(this.#storeName);
    }
    async hasKey(key) {
        const result = await this.store.readValue(this.#storeName, key);
        return !isNullish(result);
    }
    async add(element, key, { signal } = {}) {
        await this.store.saveValue(this.#storeName, key, element, { signal });
        this.#dispatchAddEvent(element, { key, position: -1 });
    }
    async delete(key, { signal, reason } = {}) {
        try {
            await this.store.deleteRecord(this.#storeName, key, { signal, checkExistence: true });
            const total = await this.getSize();
            this.#dispatchDeleteEvent(key, { total, reason });
        } catch (error) {
            if (
                !(error instanceof TaskPerformApplicationException)
                || error.cause.name !== "NotFound"
            ) {
                throw error;
            } else {
                const total = await this.getSize();
                this.#dispatchDeleteNotFoundEvent([key], { total });
                return null;
            }
        }
        return true;
    }
    async deleteMany(keys, { signal, reason } = {}) {
        const info = await this.store.deleteMultipleRecords(this.#storeName, keys, {
            signal, checkExistence: true, rejectOnFirstError: false
        });
        const total = await this.getSize();
        if (info.successCount !== 0) {
            this.#dispatchDeleteManyEvent(info.successKeys, { total, reason });
        }
        if (info.notFoundKeys.length !== 0) {
            this.#dispatchDeleteNotFoundEvent(info.notFoundKeys, { total });
        }
        return info;
    }
    async applySearchParams(params, { appliedParams = {}, signal } = {}) {
        let total = await this.getSize();
        if (total === 0) {
            return { result: [], total, appliedParams };
        }
        let asyncIterator;
        const getPagingCalculator = () => {
            return new PagingCalculator({
                total,
                perPage: params.perPage,
                page: PagingCalculator.getLastPageIfMax(params.page, total, params.perPage)
            });
        }
        let pagingCalculator;
        if (params.search) {
            asyncIterator = await this.store.recordsWithSearchTerm(this.#storeName, params.search, {
                signal
            });
            appliedParams.search = params.search;
        } else {
            const options = {
                signal
            };
            if (params.page && params.perPage && params.order === "natural") {
                pagingCalculator = getPagingCalculator();
                options.offset = pagingCalculator.offsetStart;
                options.limit = params.perPage;
                appliedParams.page = params.page;
                appliedParams.perPage = params.perPage;
            }
            asyncIterator = await this.store.records(this.#storeName, options);
        }
        let records = await Array.fromAsync(asyncIterator);
        if (params.search) {
            total = records.length;
        }
        if (params.sort && params.order) {
            const sorter = getItemsSorter({
                sortCriteria: `${params.sort} ${params.order.toUpperCase()}`,
                path: "rawValue",
                isPairs: true
            });
            records.sort(sorter);
            appliedParams.sort = params.sort;
            appliedParams.order = params.order;
        }
        if (!pagingCalculator && params.page && params.perPage) {
            pagingCalculator = getPagingCalculator();
            records = records.slice(pagingCalculator.offsetStart, pagingCalculator.offsetEnd);
            appliedParams.page = params.page;
            appliedParams.perPage = params.perPage;
        }
        return { result: records, total, appliedParams };
    }
}