"use strict";

import { isNullish } from "../functions/misc.js";
import { isOdd } from "../functions/number.js";
import { positioning } from "../functions/enumeration.js";

export class PagingCalculator extends EventTarget {
    #total;
    #perPage;
    #page;
    #autoAdjustPage;
    constructor({ total, perPage, page, autoAdjustPage = true } = {}) {
        PagingCalculator.validatePage(page, total, perPage);
        super();
        this.#total = total;
        this.#perPage = perPage;
        this.#page = page;
        this.#autoAdjustPage = autoAdjustPage;
    }
    set total(number) {
        if (number < 0) {
            throw new TypeError("Total number cannot be negative");
        }
        if (number !== this.#total) {
            const oldTotal = this.#total;
            this.#total = number;
            this.dispatchEvent(new CustomEvent("totalchange", {
                detail: { newTotal: number, oldTotal }
            }));
            if (!isNullish(this.#page) && !isNullish(this.#perPage)) {
                try {
                    PagingCalculator.validatePage(this.#page, number, this.#perPage);
                } catch (error) {
                    if (this.#autoAdjustPage && error instanceof RangeError) {
                        const maxPage = PagingCalculator.getMaxPage(number, this.#perPage);
                        this.page = maxPage;
                    }
                }
            }
        }
    }
    get total() {
        return this.#total;
    }
    set perPage(number) {
        if (number <= 0) {
            throw new TypeError("Per page number must be positive");
        }
        if (number !== this.#perPage) {
            const oldPerPage = this.#perPage;
            this.#perPage = number;
            this.dispatchEvent(new CustomEvent("perpagechange", {
                detail: { newPerPage: number, oldPerPage }
            }));
            if (!isNullish(this.#total) && !isNullish(this.#page)) {
                try {
                    PagingCalculator.validatePage(this.#page, this.#total, number);
                } catch (error) {
                    if (this.#autoAdjustPage && error instanceof RangeError) {
                        const maxPage = PagingCalculator.getMaxPage(this.#total, number);
                        this.page = maxPage;
                    }
                }
            }
        }
    }
    get perPage() {
        return this.#perPage;
    }
    set page(number) {
        if (number !== this.#page) {
            try {
                PagingCalculator.validatePage(number, this.#total, this.#perPage);
            } catch (error) {
                if (this.#autoAdjustPage && error instanceof RangeError) {
                    number = PagingCalculator.getMaxPage(number, this.#perPage);
                } else {
                    throw error;
                }
            }
            const oldPageNumber = this.#page;
            this.#page = number;
            this.dispatchEvent(new CustomEvent("pagenumberchange", {
                detail: { newPageNumber: number, oldPageNumber }
            }));
        }
    }
    get page() {
        return this.#page;
    }
    get pageCount() {
        return Math.ceil(this.#total / this.#perPage);
    }
    get maxPage() {
        return PagingCalculator.getMaxPage(this.#total, this.#perPage);
    }
    get hasNextPage() {
        return this.#page < PagingCalculator.getMaxPage(this.#total, this.#perPage);
    }
    get hasPreviousPage() {
        return this.#page > 1;
    }
    get isFirstPage() {
        return this.#page === 1;
    }
    get isLastPage() {
        return this.#page === this.maxPage;
    }
    get offsetStart() {
        return (this.#page - 1) * this.#perPage;
    }
    get offsetEnd() {
        const end = this.#page * this.#perPage;
        return end > this.#total ? this.#total : end;
    }
    get nextPage() {
        if (this.hasNextPage) {
            return this.#page + 1;
        }
        return undefined;
    }
    get previousPage() {
        if (this.hasPreviousPage) {
            return this.#page - 1;
        }
        return undefined;
    }
    get params() {
        return {
            total: this.#total,
            perPage: this.#perPage,
            pageNumber: this.#page,
        }
    }
    calculateVisiblePageRange({ size = 5, orientation = positioning.right } = {}) {
        return PagingCalculator.calculateVisiblePageRange(this.#page, this.pageCount, {
            size, orientation
        });
    }
    static getMaxPage(total, perPage) {
        return Math.ceil(total / perPage);
    }
    static getLastPageIfMax(page, total, perPage) {
        const max = PagingCalculator.getMaxPage(total, perPage);
        return page > max ? max : page;
    }
    static validatePage(page, total, perPage) {
        if (page < 0) {
            throw new TypeError("Page number cannot be negative");
        }
        if (total && page === 0) {
            throw new RangeError("Page number cannot be 0 when total is defined and positive");
        }
        const maxPage = PagingCalculator.getMaxPage(total, perPage);
        if (page > maxPage) {
            throw new RangeError(`Page number cannot exceed ${maxPage}, got ${page}`);
        }
    }
    static calculateVisiblePageRange(page, pageCount, {
        size = 5,
        orientation = positioning.right
    } = {}) {
        let offsetStart, offsetEnd, realSize;
        switch (orientation) {
            case positioning.right:
                offsetStart = page;
                offsetEnd = Math.min(page + size - 1, pageCount);
                realSize = offsetEnd - offsetStart + 1;
                if (realSize < size) {
                    const requiring = size - realSize;
                    offsetStart = Math.max(offsetStart - requiring, 1);
                }
            break;
            case positioning.left:
                offsetStart = Math.max(page - size + 1, 1);
                offsetEnd = page;
                realSize = offsetEnd - offsetStart + 1;
                if (realSize < size) {
                    const requiring = size - realSize;
                    offsetEnd = Math.min(offsetEnd + requiring, pageCount);
                }
            break;
            case positioning.center: {
                const halfSize = size / 2;
                let leftOffset = isOdd(size) ? Math.floor(halfSize) : halfSize - 1;
                let rightOffset = isOdd(size) ? Math.floor(halfSize) : halfSize;
                offsetStart = Math.max(page - leftOffset, 1);
                offsetEnd = Math.min(page + rightOffset, pageCount);
                realSize = offsetEnd - offsetStart + 1;
                if (realSize < size) {
                    const requiring = size - realSize;
                    if (pageCount - page >= size) {
                        offsetEnd = Math.min(offsetEnd + requiring, pageCount);
                    } else {
                        offsetStart = Math.max(offsetStart - requiring, 1);
                    }
                }
            } break;
        }
        return [offsetStart, offsetEnd];
    }
}