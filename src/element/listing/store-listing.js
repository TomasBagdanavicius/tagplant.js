"use strict";

import { isNullish, validateVarInterface } from "../../core/functions/misc.js";
import { objectFilterByKeys, objectFilter } from "../../core/functions/object.js";
import { adjacencyPositions } from "../../core/functions/enumeration.js";
import { createAndDefineCustomElement } from "../../core/web-component/functions.js";
import { PagingCalculator } from "../../core/calculators/paging-calculator.js";
import { StoreManager, filterElement } from "../../core/store/store-manager.js";
import { Group } from "../group.js";
import { AbstractListing } from "./abstract-listing.js";
import { ListingWithSelectableItems } from "./extensions/listing-with-selectable-items.js";
import { PagedListing } from "./extensions/paged-listing.js";
import { SortedListing } from "./extensions/sorted-listing.js";
import { SearchableListing } from "./extensions/searchable-listing.js";
import { Process } from "../../process/process.js";

export const StorePagedListing = PagedListing({
    parentConstructor: SortedListing({
        parentConstructor: SearchableListing({
            parentConstructor: ListingWithSelectableItems({ parentConstructor: AbstractListing })
        }),
        naturalOrder: true
    })
});

export const StoreListingExtender = StorePagedListing;

export class StoreListing extends StoreListingExtender {
    static #defaultOptions = {
        /* Abstract */
        classes: [],
        id: undefined,
        groupMemberBuilder: undefined,
        keyAsDataId: false,
        itemBindings: undefined,
        searchParams: {
            perPage: 25,
            page: 1,
            order: "natural",
        },
        useURLQuery: false,
        publishToURLQuery: false,
        includeMeta: true,
        includeMenu: false,
        onRemove: undefined,
        onRemoveMany: undefined,
        createMenuForEachItem: false,
        deleteEntriesMessages: undefined,
        hyperlinkBuilder: undefined,
        onVisit: undefined,
        urlBuilders: undefined,
        onHeadItems: undefined,
        /* Extensions */
        searchable: false,
        selectItems: false,
        paging: PagedListing.pagingMethods.regular,
        pagingStreamOnScroll: true,
        includePaging: true,
        sortable: true,
        perPageValues: undefined,
        sortValues: undefined,
        /* Own */
        itemTemplate: undefined,
        itemName: undefined,
        itemNameReuse: true,
        format: "default",
        chunkNames: undefined,
        includeHead: false,
        headItemSort: undefined,
        applySearchParams: undefined,
    };
    #store;
    #options;
    #total;
    #populateProcess;
    #firstParamsRequest;
    // eslint-disable-next-line constructor-super
    constructor(store, title, options = {}) {
        validateVarInterface(store, StoreManager);
        options = objectFilterByKeys(options, StoreListing.#defaultOptions);
        if ("searchParams" in options) {
            options.searchParams = {
                ...StoreListing.#defaultOptions.searchParams,
                ...options.searchParams
            };
        }
        options = { ...StoreListing.#defaultOptions, ...options };
        const explicitTotal = store.getSize();
        let total;
        if (explicitTotal instanceof Promise) {
            options.searchParams.page = undefined;
            options.startWithEmptyMessage = false;
        } else {
            total = explicitTotal;
            if (explicitTotal === 0) {
                options.searchParams.page = 0;
            }
        }
        if (!options.groupMemberBuilder) {
            if (options.itemTemplate) {
                const builder = Group.customElementMemberBuilder;
                if (options.itemName) {
                    builder.customElementName = options.itemName;
                }
                options.groupMemberBuilder = builder;
            } else if (options.format === "chunks") {
                options.groupMemberBuilder = Group.chunkBuilder;
                if (options.chunkNames) {
                    options.groupMemberBuilder.chunkNames = options.chunkNames;
                }
            }
        }
        options.entryDeletor = keys => {
            if (keys.length === 1) {
                return store.delete(keys[0]);
            } else {
                return store.deleteMany(keys);
            }
        };
        const parentOptions = objectFilterByKeys(options, StoreListingExtender.collectiveOptions);
        super(title, parentOptions);
        this.#store = store;
        this.#options = options;
        this.#firstParamsRequest = Promise.withResolvers();
        if (total !== undefined) {
            this.total = total;
            this.explicitTotal = total;
        }
        if (typeof options.format === "string") {
            this.element.setAttribute("data-format", options.format);
        }
        if (options.searchable) {
            this.includeSearchLandmark();
        }
        if (options.itemTemplate) {
            let name = options.itemName;
            if (!name) {
                let i = 1;
                do {
                    name = `listing-item-${i}`;
                    i++;
                } while (customElements.get(name));
            }
            if (!customElements.get(name) || !options.itemNameReuse) {
                createAndDefineCustomElement(name, { template: options.itemTemplate });
            }
        }
        if (options.includeHead && options.format === "chunks" && options.chunkNames) {
            this.createHead(Object.entries(options.chunkNames));
        }
        this.#store.addEventListener("add", e => {
            this.#firstParamsRequest.promise.then(() => {
                this.#add(e.detail.element, e.detail.key, e.detail.position);
            });
        });
        const init = total => {
            this.total = total;
            this.explicitTotal = total;
            this.setSearchParams(this.searchParams, { forceWhenMatching: true, origin: "init" });
        }
        if (explicitTotal instanceof Promise) {
            const process = Process.wrapAroundPromise(explicitTotal, [
                "storelistinginit", "Store Listing Init"
            ]);
            process.delayedInfoToggler(this.footer, {
                delay: 150,
                adjacency: adjacencyPositions.afterbegin
            });
            explicitTotal.then(total => {
                init(total);
            }).catch(error => {
                console.error(error);
            });
        } else {
            init(explicitTotal);
        }
        const toDelete = keys => {
            if ((!this.#options.paging || this.pageCount === 1) && !store.isDense) {
                for (const key of keys) {
                    this.removeItem(key);
                }
            } else {
                for (const key of keys) {
                    if (this.group.hasKey(key)) {
                        this.reload();
                        break;
                    }
                }
            }
        }
        this.#store.addEventListener("delete", e => {
            const { key, total } = e.detail;
            toDelete([key]);
            this.total = total;
            this.explicitTotal = total;
        });
        this.#store.addEventListener("deletemany", e => {
            const { keys, total } = e.detail;
            toDelete(keys);
            this.total = total;
            this.explicitTotal = total;
        });
        this.#store.addEventListener("deletenotfound", e => {
            const { keys, total } = e.detail;
            this.total = total;
            for (const key of keys) {
                this.removeItem(key);
            }
        });
    }
    newInstance(options) {
        return new this.constructor(this.#store, this.originalTitle, options || this.#options);
    }
    static get defaultOptions() {
        return Object.assign({}, this.#defaultOptions);
    }
    get options() {
        return Object.assign({}, this.#options);
    }
    set total(number) {
        this.#total = number;
        if (this.#options.paging) {
            super.total = number;
        }
    }
    get total() {
        return this.#total;
    }
    set explicitTotal(number) {
        super.explicitTotal = number;
    }
    get explicitTotal() {
        return super.explicitTotal;
    }
    async #populate(searchParams, process, initiators) {
        let pageChangeOnly;
        if (this.#options.paging) {
            pageChangeOnly = StorePagedListing.isPageChangeOnlyByInitiators(initiators);
            this.perPage = Number(searchParams.perPage);
            this.pageNumber = Number(searchParams.page);
            const prevPageNumber = this.previousPageNumber;
            if (!this.isNonStreamPaging && pageChangeOnly && prevPageNumber - 1 === this.pageNumber) {
                const calculator = new PagingCalculator({
                    total: this.total,
                    perPage: this.perPage,
                    page: prevPageNumber
                });
                this.group.removePortion(calculator.offsetStart, calculator.offsetEnd - 1);
                // Assuming that all applied
                return Object.assign({}, searchParams);
            }
        }
        const params = objectFilter(searchParams, (name, value) => !isNullish(value));
        const info = await this.#store.applySearchParams(params, {
            signal: process.signal
        });
        let { result: iterable, total, appliedParams } = info;
        if (this.#options.applySearchParams && typeof this.#options.applySearchParams === "function") {
            ({ iterable, total, appliedParams } = this.#options.applySearchParams(searchParams, iterable, total, appliedParams));
        }
        // "natural" order will not be marked as applied
        if (searchParams.order === "natural") {
            appliedParams.order = "natural";
        }
        this.total = total;
        this.putDownEmptyMessage();
        // Suspend, because otherwise when overlapping request comes in and the group is emptied, "no items" message will be shown.
        this.suspendEmptyMessage();
        if (this.isNonStreamPaging || !pageChangeOnly) {
            this.empty();
        }
        this.#populateProcess = process;
        process.delayedInfoToggler(this.footer, {
            adjacency: adjacencyPositions.afterbegin
        });
        try {
            for await (let [key, element] of iterable) {
                if (this.#populateProcess.id !== process.id) {
                    throw new DOMException("Process aborted", "AbortError");
                }
                const elementToInsert = Object.hasOwn(element, "result") && element.result
                    ? element.result
                    : element;
                this.#insertItem(elementToInsert, key);
            }
        } finally {
            if (this.#populateProcess.id === process.id) {
                this.unsuspendEmptyMessage();
                this.revisitEmptyMessage();
            }
        }
        return appliedParams;
    }
    #insertItem(element, key, position) {
        let attachedItem;
        if (this.#options.format === "chunks" && "toElementChunks" in element) {
            const chunkedElement = element.toElementChunks({
                search: this.searchQuery,
                chunkList: this.options.chunkNames,
            });
            attachedItem = this.insertItemFromElement(chunkedElement, position, key, element);
        } else if (Group.hasGroupMemberMethod(element)) {
            const groupMember = element.toGroupMember({ search: this.searchQuery });
            attachedItem = this.insertItem(groupMember, position, key, element);
        } else {
            attachedItem = this.insertItemFromElement(element, position, key, element);
        }
        return attachedItem;
    }
    #add(element, key, position) {
        const oldTotal = this.total;
        if (position < 0) {
            position = oldTotal;
        }
        // E.g. might not match search criteria
        let isValid = true;
        const itemCount = this.itemCount;
        const searchParams = this.searchParams;
        if (
            // Paging disabled, or no items, or per page larger than the number of items
            (!this.#options.paging || itemCount === 0 || itemCount < this.perPage)
            && (isNullish(searchParams.order) || searchParams.order === "natural")
        ) {
            let elementToInsert = element;
            let match = true;
            if (this.searchQuery) {
                match = filterElement(element, this.searchQuery);
                if (match !== null) {
                    elementToInsert = match;
                }
            }
            if (match) {
                isValid = true;
                this.#insertItem(elementToInsert, key, position);
            } else {
                isValid = false;
            }
        } else if (!this.#options.paging || this.isPositionWithinPageRange(position)) {
            isValid = true;
            this.reload();
        }
        const newTotal = oldTotal + 1;
        if (isValid) {
            this.total = newTotal;
        }
        this.explicitTotal = newTotal;
    }
    reload() {
        return this.setSearchParams(this.searchParams, { forceWhenMatching: true });
    }
    async setParamsRequest(searchParams, { initiators, process }) {
        let result;
        if (this.explicitTotal !== 0) {
            result = await this.#populate(searchParams, process, initiators);
        } else {
            this.empty();
            result = Object.create(null);
        }
        if (!this.#firstParamsRequest.resolved) {
            this.#firstParamsRequest.resolve();
            this.#firstParamsRequest.resolved = true;
        }
        return result;
    }
}