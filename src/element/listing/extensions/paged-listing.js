"use strict";

import { objectFilterByKeys } from "../../../core/functions/object.js";
import { cloneCustomEvent } from "../../../core/functions/misc.js";
import { addDistinctEventListeners } from "../../../core/events/functions.js";
import { EnumerationMember, enumList, isEnumListing, positioning } from "../../../core/functions/enumeration.js";
import { PagingCalculator } from "../../../core/calculators/paging-calculator.js";
import { Menu } from "../../menu.js";
import { Navigation } from "../../navigation.js";

export const PagedListing = ({ parentConstructor } = {}) => {
    const Mixin = class extends parentConstructor {
        static #defaultOptions = {
            paging: PagedListing.pagingMethods.regular,
            perPageValues: [5, 10, 20, 25, 50, 100],
            includePaging: true,
            pagingStreamOnScroll: true,
        };
        #options;
        #calculator;
        #perPageValues;
        #previousPageNumber;
        constructor(title, options) {
            super(title, options);
            this.#options = objectFilterByKeys(options, Mixin.#defaultOptions);
            if (
                this.#options.paging instanceof EnumerationMember
                && isEnumListing(this.#options.paging.listing, "pagingMethods")
            ) {
                this.registerSearchParams([{
                    name: "page",
                    type: "menu",
                    controlBuilder: this.releasePagingLandmark.bind(this)
                }, {
                    name: "perPage",
                    type: "menu",
                    controlBuilder: this.releasePerPageMenu.bind(this)
                }]);
                const perPage = options.searchParams?.perPage;
                const page = options.searchParams?.page;
                this.#calculator = new PagingCalculator({ perPage, page });
                this.#calculator.addEventListener("totalchange", e => {
                    this.dispatchEvent(cloneCustomEvent(e));
                });
                this.#calculator.addEventListener("pagenumberchange", e => {
                    const { oldPageNumber } = e.detail;
                    this.#previousPageNumber = oldPageNumber;
                    this.dispatchEvent(cloneCustomEvent(e));
                });
                const adjustDescriptionListPair = (name, title, propName) => {
                    const pair = this.meta.getByName(name);
                    if (!pair) {
                        this.meta.appendPair(title, this.#calculator[propName], { name });
                    } else {
                        const [, details] = pair;
                        details.textContent = this.#calculator[propName];
                    }
                }
                const adjustPageCount = () => {
                    adjustDescriptionListPair("pageCount", "Page Count", "pageCount");
                }
                const adjustPerPage = () => {
                    adjustDescriptionListPair("perPage", "Per Page", "perPage");
                }
                const adjustPageNumber = () => {
                    adjustDescriptionListPair("pageNumber", "Page Number", "page");
                }
                this.#calculator.addEventListener("perpagechange", e => {
                    this.dispatchEvent(cloneCustomEvent(e));
                    adjustPageCount();
                });
                this.addEventListener("totalchange", e => {
                    const { newTotal } = e.detail;
                    const totalPair = this.meta.getByName("total");
                    if (!totalPair) {
                        this.meta.appendPair("Total", newTotal, { name: "total" });
                    } else {
                        const [, details] = totalPair;
                        details.textContent = newTotal;
                    }
                    adjustPageCount();
                });
                if (this.#options.perPageValues) {
                    if (Array.isArray(this.#options.perPageValues)) {
                        this.#perPageValues = Mixin.arrayToObject(this.#options.perPageValues);
                    } else if (typeof this.#options.perPageValues === "object") {
                        this.#perPageValues = this.#options.perPageValues;
                    }
                }
                if (perPage) {
                    adjustPerPage();
                }
                if (page) {
                    adjustPageNumber();
                }
                this.addEventListener("perpagechange", () => {
                    adjustPerPage();
                });
                this.addEventListener("pagenumberchange", () => {
                    adjustPageNumber();
                });
                if (this.#options.includePaging) {
                    this.includePagingLandmark({ whenInactive: "disable" });
                }
                if (
                    this.#options.paging === PagedListing.pagingMethods.stream
                    && this.#options.pagingStreamOnScroll
                ) {
                    const offset = 100;
                    let waitingForNextPage = false;
                    const intersectionCallback = entries => {
                        entries.forEach(async entry => {
                            if (entry.isIntersecting && !waitingForNextPage) {
                                waitingForNextPage = true;
                                await this.goToNextPageUntil(() => this.hasRemainingSpaceOffset(offset));
                                waitingForNextPage = false;
                            }
                        });
                    };
                    let observer = new IntersectionObserver(intersectionCallback, {
                        threshold: 0,
                        rootMargin: `0px 0px ${offset}px 0px`
                    });
                    let isObserving = false;
                    this.addEventListener("searchparamsapplied", async () => {
                        /* const { searchParams } = e.detail; */
                        if (!waitingForNextPage && this.hasRemainingSpaceOffset(offset)
                            /* && (!this.previousPageNumber
                                || this.previousPageNumber === searchParams.page - 1) */) {
                            waitingForNextPage = true;
                            await this.goToNextPageUntil(() => this.hasRemainingSpaceOffset(offset));
                            waitingForNextPage = false;
                            observer.observe(this.footer);
                        }
                        if (!isObserving) {
                            observer.observe(this.footer);
                            isObserving = true;
                        }
                    });
                }
            }
        }
        static get collectiveOptions() {
            return { ...parentConstructor.collectiveOptions, ...this.#defaultOptions };
        }
        get pagingMethods() {
            return PagedListing.pagingMethods;
        }
        set total(number) {
            if (number < 0) {
                throw new RangeError(`Total number must be positive, got ${number}`);
            }
            if (this.#calculator && number !== this.#calculator.total) {
                if (number > 0 && !this.pageNumber) {
                    this.pageNumber = 1;
                    this.searchParams.page = 1;
                } else if (number === 0) {
                    this.pageNumber = 0;
                    this.searchParams.page = 0;
                }
                this.#calculator.total = number;
            }
        }
        get total() {
            if (this.#calculator) {
                return this.#calculator.total;
            }
            return undefined;
        }
        set perPage(number) {
            if (this.#calculator && number !== this.#calculator.perPage) {
                this.#calculator.perPage = number;
            }
        }
        get perPage() {
            return this.#calculator.perPage;
        }
        set pageNumber(number) {
            if (this.#calculator && number !== this.#calculator.page) {
                this.#calculator.page = number;
            }
        }
        get pageNumber() {
            return this.#calculator.page;
        }
        get previousPageNumber() {
            return this.#previousPageNumber;
        }
        get offsetStart() {
            return this.#calculator.offsetStart;
        }
        get offsetEnd() {
            return this.#calculator.offsetEnd;
        }
        get isNonStreamPaging() {
            return this.#options.paging !== PagedListing.pagingMethods.stream;
        }
        get pageCount() {
            return this.#calculator.pageCount;
        }
        #adjustMainPagingButtons(holder, {
            forwardsLabel = "Next Page",
            forwardsTitle = "Go to next page",
            backwardsLabel = "Previous Page",
            backwardsTitle = "Go to previous page",
            trailingPos = 3,
            // hide|disable
            whenInactive = "disable",
            includeFirstAndLastPage = true
        } = {}) {
            const items = [{
                name: "prev-page",
                label: backwardsLabel,
                title: backwardsTitle,
                number: () => this.#calculator.previousPage,
                pos: () => holder.list.has("first-page") ? 1 : 0,
                active: this.#calculator.hasPreviousPage
            }, {
                name: "next-page",
                label: forwardsLabel,
                title: forwardsTitle,
                number: () => this.#calculator.nextPage,
                pos: trailingPos,
                active: this.#calculator.hasNextPage
            }];
            if (includeFirstAndLastPage) {
                items.unshift({
                    name: "first-page",
                    label: "First Page",
                    number: 1,
                    pos: 0,
                    active: this.#calculator.hasPreviousPage
                });
                items.push({
                    name: "last-page",
                    label: "Last Page",
                    number: () => this.#calculator.pageCount,
                    pos: trailingPos + 1,
                    active: this.#calculator.hasNextPage
                });
            }
            const isNavigationHolder = holder instanceof Navigation;
            items.forEach(({ name, label, title, number, pos, active }) => {
                const exists = holder.list.has(name);
                let button;
                let page;
                if (!exists && (active || (whenInactive === "disable" && !isNavigationHolder))) {
                    pos = typeof pos === "number" ? pos : pos();
                    page = typeof number === "number" ? number : number();
                    ([button] = holder._createButton(label, pos, name, page));
                    button.title = title;
                    button.addEventListener("click", e => {
                        // Can be input button or hyperlink
                        e.preventDefault();
                        const page = typeof number === "number" ? number : number();
                        this.setSearchParam("page", page);
                    });
                    if (whenInactive === "disable") {
                        button.disabled = !active;
                        if (active) {
                            button.title = title;
                        } else {
                            button.removeAttribute("title");
                        }
                    }
                } else if (isNavigationHolder) {
                    button = holder.list.getItem(name)?.firstElementChild;
                    if (button) {
                        const num = typeof number === "number" ? number : number();
                        button._updateButton(num);
                    }
                }
                if (whenInactive === "disable" && !isNavigationHolder) {
                    if (!button && exists) {
                        button = holder.getButton(name);
                        button.disabled = !active;
                        if (active) {
                            button.title = title;
                        } else {
                            button.removeAttribute("title");
                        }
                    }
                } else if (exists && !active) {
                    holder.remove(name);
                }
            });
        }
        #createPaginationHolder(title, { type = "menu", classes = [] } = {}) {
            let holder;
            if (type === "navigation") {
                holder = new Navigation(title, classes);
                holder._createButton = (text, pos, name, page) => {
                    const pageURL = new URL(location.href);
                    this.addSearchParamsToURLComponent(pageURL.searchParams);
                    pageURL.searchParams.set(this.translateURLQueryParam("page"), page);
                    const hyperlink = super.options.hyperlinkBuilder.buildHyperlink(pageURL, text);
                    const [listItem] = holder.insert(hyperlink, pos, name);
                    hyperlink._updateButton = page => {
                        const url = new URL(hyperlink.href);
                        url.searchParams.set(this.translateURLQueryParam("page"), page);
                        hyperlink.href = url;
                    }
                    return [hyperlink, listItem];
                }
            } else {
                holder = new Menu({ headingText: title, classes });
                holder._createButton = (text, pos, name) => {
                    const [listItem, , button] = holder.insertButton(text, pos, name);
                    return [button, listItem];
                }
            }
            return holder;
        }
        releasePagingLandmark({
            includeFirstAndLastPage = false,
            whenInactive = "hide",
            type = "menu"
        } = {}) {
            if (!this.#options.paging) {
                return;
            }
            let pagingTitle;
            let pagingClasses;
            if (type === "navigation") {
                pagingTitle = "Paging Navigation";
                pagingClasses = ["paging-navigation"];
            } else {
                pagingTitle = "Paging";
                pagingClasses = ["paging"];
            }
            const holder = this.#createPaginationHolder(pagingTitle, { type, classes: pagingClasses });
            let forwardsLabel, forwardsTitle;
            let backwardsLabel, backwardsTitle;
            switch (this.#options.paging) {
                case PagedListing.pagingMethods.regular:
                    forwardsLabel = "Next Page";
                    forwardsTitle = "Go to next page";
                    backwardsLabel = "Previous Page";
                    backwardsTitle = "Go to previous page";
                    break;
                case PagedListing.pagingMethods.stream:
                    forwardsLabel = "Show More";
                    forwardsTitle = "Show more entries";
                    backwardsLabel = "Show Less";
                    backwardsTitle = "Show less entries";
                    break;
            }
            const adjust = () => {
                this.#adjustMainPagingButtons(holder, {
                    forwardsLabel,
                    forwardsTitle,
                    backwardsLabel,
                    backwardsTitle,
                    includeFirstAndLastPage,
                    whenInactive
                });
            }
            adjust();
            addDistinctEventListeners(this, {
                "totalchange": adjust,
                "pagenumberchange": adjust,
                "perpagechange": adjust
            });
            return holder;
        }
        releaseExtendedPagingLandmark({
            size = 5,
            orientation = positioning.right,
            whenInactive = "hide",
            type = "menu"
        } = {}) {
            if (this.#options.paging !== PagedListing.pagingMethods.regular) {
                return;
            }
            const holder = this.#createPaginationHolder("Extended Paging", {
                type, classes: ["extended-paging"]
            });
            const adjust = () => {
                for (let i = 1; i <= size; i++) {
                    holder.remove(`page-i${i}`);
                }
                const [offsetStart, offsetEnd] = this.#calculator.calculateVisiblePageRange({
                    size, orientation
                });
                let count = size;
                const pos = holder.list.has("first-page") ? 2 : 0;
                for (let pageNumber = offsetEnd; pageNumber >= offsetStart; pageNumber--) {
                    const [button, listItem] = holder._createButton(pageNumber, pos, `page-i${count}`, pageNumber);
                    if (pageNumber === this.pageNumber) {
                        listItem.classList.add("active");
                        button.disabled = true;
                    }
                    button.addEventListener("click", e => {
                        e.preventDefault();
                        this.setSearchParam("page", pageNumber);
                    });
                    count--;
                }
                this.#adjustMainPagingButtons(holder, { trailingPos: size + 2, whenInactive });
            }
            adjust();
            addDistinctEventListeners(this, {
                "totalchange": adjust,
                "pagenumberchange": adjust,
                "perpagechange": adjust
            });
            return holder;
        }
        registerPerPageValues(values) {
            this.#perPageValues = values;
            if (Array.isArray(values)) {
                values = Mixin.arrayToObject(values);
            }
            this.dispatchEvent(new CustomEvent("registerperpagevalues", {
                detail: { values }
            }));
        }
        releasePerPageMenu({ menuOptions } = {}) {
            const menu = this.buildControlFromData({
                type: "menu",
                values: this.#perPageValues,
                requiresItems: true,
                processName: "listingperpage",
                processTitle: "Listing Per Page",
            }, "perPage", { title: "Per Page", menuOptions });
            if (!this.#perPageValues) {
                this.addEventListener("registerperpagevalues", e => {
                    menu._populator(e.detail.values);
                });
            }
            return menu;
        }
        releasePagingNavigation({ includeFirstAndLastPage = false } = {}) {
            return this.releasePagingLandmark({
                includeFirstAndLastPage,
                type: "navigation"
            });
        }
        includePagingLandmark({ whenInactive = "disable" } = {}) {
            let landmarkEl = this.header.querySelector(".paging");
            if (!landmarkEl) {
                const landmark = this.releasePagingLandmark({ whenInactive });
                this.footer.append(landmark.element);
            }
        }
        async goToNextPage() {
            const nextPageNumber = this.#calculator.nextPage;
            if (!nextPageNumber) {
                return null;
            }
            return await this.setSearchParams({ page: nextPageNumber, origin: "next-page" });
        }
        async goToPreviousPage() {
            const prevPageNumber = this.#calculator.previousPage;
            if (!prevPageNumber) {
                return null;
            }
            return await this.setSearchParams({ page: prevPageNumber });
        }
        async goToNextPageUntil(callback) {
            let nextPage;
            do {
                nextPage = await this.goToNextPage();
            } while (nextPage && callback());
        }
        async goToPreviousPageUntil(callback) {
            let previousPage;
            do {
                previousPage = await this.goToPreviousPage();
            } while (previousPage && callback());
        }
        isPositionWithinPageRange(position) {
            const offsetStart = this.offsetStart;
            return offsetStart <= position && offsetStart + this.perPage > position;
        }
        static arrayToObject(array) {
            const result = {};
            for (const value of array.values()) {
                result[value] = value;
            }
            return result;
        }
        static isPageChangeOnlyByInitiators(initiators) {
            const initiatorsKeys = Object.keys(initiators);
            let pageChangeOnly = false;
            if (initiatorsKeys.length === 1 && initiatorsKeys[0] === "page") {
                pageChangeOnly = true;
            }
            return pageChangeOnly;
        }
    }
    return Mixin;
}

PagedListing.pagingMethods = enumList({
    regular: "regular",
    stream: "stream",
}, "pagingMethods");