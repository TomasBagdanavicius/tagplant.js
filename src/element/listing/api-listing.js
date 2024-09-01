"use strict";

import { StringTemplate } from "../../core/functions/string.js";
import { objectFilterByKeys } from "../../core/functions/object.js";
import { adjacencyPositions } from "../../core/functions/enumeration.js";
import { PagingCalculator } from "../../core/calculators/paging-calculator.js";
import { AbstractListing } from "./abstract-listing.js";
import { PagedListing } from "./extensions/paged-listing.js";
import { SortedListing } from "./extensions/sorted-listing.js";
import { SearchableListing } from "./extensions/searchable-listing.js";
import { ListingWithSelectableItems } from "./extensions/listing-with-selectable-items.js";
import { Process } from "../../process/process.js";
import { networkRequest } from "../../process/network-request.js";
import { StoreListingExtender, StorePagedListing } from "./store-listing.js";

const ApiListingExtender = PagedListing({
    parentConstructor: SortedListing({
        parentConstructor: SearchableListing({
            parentConstructor: ListingWithSelectableItems({
                parentConstructor: AbstractListing
            }),
        })
    })
});

export class ApiListing extends ApiListingExtender {
    static #defaultOptions = {
        /* Abstract */
        classes: [],
        id: undefined,
        groupMemberBuilder: undefined,
        keyAsDataId: true,
        itemBindings: undefined,
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
        searchable: true,
        selectItems: false,
        paging: PagedListing.pagingMethods.regular,
        pagingStreamOnScroll: true,
        sortable: true,
        includePaging: true,
        /* Own */
        autostart: true,
        includeHead: false,
        headItemSort: undefined,
    }
    #endpointURL;
    #options;
    #loadCount = 0;
    #searchParamTranslations = {};
    #hasStarted = false;
    #source;
    #sourceVariant;
    constructor(title, source, options = {}) {
        options = objectFilterByKeys(options, ApiListing.#defaultOptions);
        const sourceType = typeof source;
        let sourceVariant;
        if (sourceType !== "string" && sourceType !== "object") {
            throw new TypeError("Source must be either a string, URL, or schema object");
        }
        let endpointURL;
        if (sourceType === "string" || source instanceof URL) {
            endpointURL = new URL(source);
            sourceVariant = "url";
        } else if (!source.endpoints?.current) {
            throw new DOMException("Source is missing endpoint URL", "NotFoundError");
        } else {
            endpointURL = new URL(source.endpoints.current);
            sourceVariant = "schema";
        }
        options = { ...ApiListing.#defaultOptions, ...options };
        options.entryDeletor = async (keys, process) => {
            let URLBuilder;
            if (keys.length === 1) {
                URLBuilder = this.getURLBuilder("delete");
            } else if (keys.length > 1) {
                URLBuilder = this.getURLBuilder("delete_many");
            }
            const url = URLBuilder({ key: keys });
            console.log("Acc entry delete:", url);
            const cancelablePromise = networkRequest(url, process);
            const payload = await cancelablePromise;
            if (keys.length === 1) {
                return payload.data.result === 1;
            } else {
                return payload.data;
            }
        };
        const parentOptions = objectFilterByKeys(options, StoreListingExtender.collectiveOptions);
        parentOptions.startWithEmptyMessage = false;
        super(title, parentOptions);
        this.#endpointURL = endpointURL;
        this.#options = options;
        this.#source = source;
        this.#sourceVariant = sourceVariant;
        if (sourceVariant === "schema" && "search_param_translations" in source) {
            this.assignSearchParamTranslations(source.search_param_translations);
        }
        if (this.#options.autostart) {
            this.start();
        }
    }
    newInstance(options) {
        return new ApiListing(this.originalTitle, this.#source, options || this.#options);
    }
    static get defaultOptions() {
        return Object.assign({}, this.#defaultOptions);
    }
    get options() {
        return Object.assign({}, this.#options);
    }
    get translatedSearchParams() {
        return this.translateSearchParams(this.searchParams);
    }
    get URLSearchQuery() {
        return new URLSearchParams(this.translatedSearchParams);
    }
    get hasStarted() {
        return this.#hasStarted;
    }
    get loadCount() {
        return this.#loadCount;
    }
    async start() {
        if (this.#sourceVariant === "url") {
            await this.setSearchParams({}, { forceWhenMatching: true });
        } else {
            const searchParams = {};
            for (const [name, value] of Object.entries(this.#source.search_params)) {
                const translation = this.convertTranslationToSearchParam(name);
                searchParams[translation] = value;
            }
            await this.setSearchParams(searchParams, { forceWhenMatching: true });
        }
    }
    assignSearchParamTranslations(dict) {
        if (typeof dict === "object") {
            for (const [name, value] of Object.entries(dict)) {
                if (this.hasRegisteredSearchParam(name)) {
                    this.#searchParamTranslations[name] = value;
                }
            }
        }
    }
    translateSearchParam(name) {
        if (this.hasRegisteredSearchParam(name)) {
            if (name in this.#searchParamTranslations) {
                return this.#searchParamTranslations[name];
            } else {
                return name;
            }
        }
    }
    translateSearchParams(params) {
        const result = {};
        for (const [name, value] of Object.entries(params)) {
            const translation = this.translateSearchParam(name);
            if (translation !== undefined) {
                result[translation] = value;
            }
        }
        return result;
    }
    convertTranslationToSearchParam(translation) {
        for (const [name, value] of Object.entries(this.#searchParamTranslations)) {
            if (value === translation) {
                return name;
            }
        }
        return translation;
    }
    async #load(searchParams, process, { initiators } = {}) {
        process.delayedInfoToggler(this.footer, {
            delay: 0,
            adjacency: adjacencyPositions.afterbegin
        });
        const requestURL = new URL(this.#endpointURL);
        if (this.#hasStarted) {
            AbstractListing.addSearchParamsToURLComponent(
                requestURL.searchParams,
                this.translateSearchParams(searchParams)
            );
        }
        console.log("API Listing URL:", requestURL.toString());
        const cancelablePromise = networkRequest(requestURL, process);
        this.dispatchEvent(new CustomEvent("loadstart", {
            detail: { process }
        }));
        Process.processToResolvers(process, cancelablePromise);
        const result = await cancelablePromise;
        const appliedSearchParams = searchParams;
        this.#loadCount++;
        this.#populate(result, { appliedSearchParams, initiators });
        return appliedSearchParams;
    }
    #populateMetaData(data) {
        if ("search_param_translations" in data) {
            this.assignSearchParamTranslations(data.search_param_translations);
        }
        if ("custom_search_params" in data) {
            this.registerSearchParams(data.custom_search_params);
        }
        if ("sort_values" in data) {
            this.registerSortValues(data.sort_values);
        }
        if ("per_page_values" in data) {
            this.registerPerPageValues(data.per_page_values);
        }
        if (this.#options.searchable && (!("search" in data) || data.search)) {
            this.includeSearchLandmark({
                fieldName: this.translateSearchParam("search")
            });
        }
        if ("relevance_key" in data) {
            this.relevanceKey = data.relevance_key;
        }
        if (this.#options.includeHead && "titles" in data && !this.head) {
            this.createHead(Object.entries(data.titles));
        }
        if ("endpoints" in data) {
            const URLBuilders = {};
            const buildersConfig = {
                visit: { endpointPropName: "entry_visit" },
                edit: { endpointPropName: "entry_update" },
                delete: { endpointPropName: "entry_delete" },
                delete_many: { endpointPropName: "entry_delete_many" },
            };
            const missingEndpoints = [];
            for (const [name, { endpointPropName }] of Object.entries(buildersConfig)) {
                if (endpointPropName in data.endpoints) {
                    URLBuilders[name] = ({ key, element }) => {
                        const endpoint = data.endpoints[endpointPropName];
                        if (!Array.isArray(key) || key.length === 1) {
                            return StringTemplate.fromString(endpoint, /{{(.*?)}}/g).format({
                                value: key,
                                ...element,
                            });
                        } else {
                            const keys = Array.isArray(key) ? key : [key];
                            const queryParamName = endpoint.query_param;
                            const url = new URL(endpoint.url);
                            const params = new URLSearchParams;
                            keys.forEach(key => {
                                params.append(`${queryParamName}[]`, key);
                            });
                            url.search = params.toString();
                            return url.toString();
                        }
                    };
                } else {
                    missingEndpoints.push(name);
                }
            }
            if (missingEndpoints && "data_model_path" in data && "primary_container_name" in data) {
                for (const name of missingEndpoints) {
                    URLBuilders[name] = ({ key }) => {
                        /* Searches by primary key path by looping through data. Since data is not indexed by primary key path, loop search is required. */
                        for (const value of data.data) {
                            if ("endpoints" in value && name in value.endpoints) {
                                const entry = value[data.data_model_path];
                                if (key == entry[data.primary_container_name]) {
                                    return value.endpoints[name];
                                }
                            }
                        }
                    };
                }
            }
            this.registerURLBuilders(URLBuilders);
        }
    }
    async setParamsRequest(searchParams, { initiators, process } = {}) {
        let appliedSearchParams;
        if (this.#sourceVariant === "url" || this.#hasStarted) {
            appliedSearchParams = await this.#load(searchParams, process, { initiators });
        } else {
            appliedSearchParams = this.#populate(this.#source, { initiators });
        }
        return appliedSearchParams;
    }
    #populate(result, { appliedSearchParams = {}, initiators } = {}) {
        this.#populateMetaData(result);
        const total = Number(result.total);
        this.total = total;
        for (const [name, value] of Object.entries(result.search_params)) {
            const translatedName = this.convertTranslationToSearchParam(name);
            if (translatedName) {
                appliedSearchParams[translatedName] = value;
            }
        }
        if (this.#options.paging) {
            this.perPage = Number(appliedSearchParams.perPage);
            this.pageNumber = Number(appliedSearchParams.page);
        }
        let pageChangeOnly = false;
        if (initiators) {
            pageChangeOnly = StorePagedListing.isPageChangeOnlyByInitiators(initiators);
        }
        const prevPageNumber = this.previousPageNumber;
        if (!this.isNonStreamPaging && pageChangeOnly && prevPageNumber - 1 === this.pageNumber) {
            const calculator = new PagingCalculator({
                total: this.total,
                perPage: this.perPage,
                page: prevPageNumber
            });
            this.group.removePortion(calculator.offsetStart, calculator.offsetEnd - 1);
            return;
        }
        if (total !== 0) {
            this.putDownEmptyMessage();
        } else {
            this.putUpEmptyMessage();
        }
        if (this.isNonStreamPaging || !pageChangeOnly) {
            this.empty();
        }
        if (total !== 0) {
            let path;
            //#todo: fetch primaryPath
            let primaryPath = "id";
            if ("data_model_path" in result) {
                path = result.data_model_path;
            }
            if ("primary_container_name" in result) {
                primaryPath = result.primary_container_name;
            }
            for (const source of Object.values(result.data)) {
                let element = Object.assign({}, source);
                let originalElement = Object.assign({}, element);
                if (path) {
                    element = element[path];
                }
                if (!Object.hasOwn(element, primaryPath)) {
                    console.error(`Element is missing primary path property`, element);
                }
                this.appendItemFromElement(element, element[primaryPath], originalElement);
            }
            this.revisitEmptyMessage();
        }
        this.#hasStarted = true;
        return appliedSearchParams;
    }
    static fromSchema(schema, options = {}) {
        return new ApiListing(schema.title, schema, options);
    }
}