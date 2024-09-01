"use strict";

import { createElement, insertAfter } from "../../../core/functions/node.js";
import { objectFilterByKeys } from "../../../core/functions/object.js";
import { isNullish } from "../../../core/functions/misc.js";
import { adjacencyPositions } from "../../../core/functions/enumeration.js";
import { CustomFormElementsBuilder } from "../../form/custom-form-elements-builder.js";

export const SearchableListing = ({ parentConstructor } = {}) => {
    const Mixin = class extends parentConstructor {
        static #defaultOptions = {
            searchable: true
        };
        #options;
        #searchQuery;
        constructor(title, options) {
            super(title, options);
            this.#options = objectFilterByKeys(options, Mixin.#defaultOptions);
            if (this.#options.searchable) {
                this.registerSearchParams([{
                    name: "search",
                    type: "search",
                    controlBuilder: this.releaseSearchLandmark.bind(this)
                }]);
                let savedParams;
                this.addEventListener("requestparams", e => {
                    const { params, requestParams, origin } = e.detail;
                    if ("search" in params) {
                        const hasValue = !isNullish(params.search);
                        if (this.hasRegisteredSearchParam("sort")) {
                            if (this.isRelevanceInSortValues) {
                                if (hasValue) {
                                    if (isNullish(this.searchParams.search)) {
                                        savedParams = {
                                            sort: this.searchParams.sort,
                                            order: this.searchParams.order
                                        };
                                    }
                                    if (this.relevanceKey) {
                                        params.sort = this.relevanceKey;
                                    } else {
                                        delete params.sort;
                                        delete requestParams.sort;
                                    }
                                    params.order = "desc";
                                } else if (savedParams) {
                                    params.sort = savedParams.sort;
                                    params.order = savedParams.order;
                                    savedParams = undefined;
                                }
                            } else if (this.hasNaturalOrder && isNullish(params.order)) {
                                params.order = "natural";
                            }
                        }
                        if (this.hasRegisteredSearchParam("page") && origin === "search") {
                            params.page = 1;
                        }
                    }
                });
            }
        }
        static get collectiveOptions() {
            return { ...parentConstructor.collectiveOptions, ...this.#defaultOptions };
        }
        get searchQuery() {
            return this.#searchQuery;
        }
        releaseSearchLandmark({ fieldName = "query", disableIfNoItems = true } = {}) {
            const formElementsBuilder = new CustomFormElementsBuilder;
            const formElement = formElementsBuilder.createFormElement(fieldName, {
                type: "search",
                title: "Search",
            });
            const searchLandmarkEl = createElement("search", {
                elems: [formElement]
            });
            if (disableIfNoItems && this.explicitTotal === 0 && !this.#searchQuery) {
                formElement.setAttribute("disabled", "disabled");
            }
            formElement.addEventListener("input", e => {
                if (e.target.value !== this.#searchQuery) {
                    const oldSearchQuery = this.#searchQuery;
                    this.#searchQuery = e.target.value || undefined;
                    const cancelablePromise = this.setSearchParam("search", this.#searchQuery, {
                        origin: "search"
                    });
                    const process = cancelablePromise.process;
                    const connectProcess = () => {
                        process.delayedInfoToggler(formElement.shadowRoot.lastElementChild, {
                            adjacency: adjacencyPositions.afterend
                        });
                    }
                    if (formElement.isConnected) {
                        connectProcess();
                    } else {
                        formElement.addEventListener("fieldpopulated", () => {
                            connectProcess();
                        });
                    }
                    this.dispatchEvent(new CustomEvent("searchchange", {
                        detail: { newSearchQuery: this.#searchQuery, oldSearchQuery, process }
                    }));
                }
            });
            this.addEventListener("searchparamsset", e => {
                const { initiators } = e.detail;
                if ("search" in initiators) {
                    let value = initiators.search;
                    if (isNullish(value)) {
                        value = "";
                    }
                    if (formElement.value !== value) {
                        this.#searchQuery = value;
                        formElement.value = value;
                    }
                }
            });
            if (disableIfNoItems) {
                this.group.addEventListener("countchange", e => {
                    const { newCount, oldCount } = e.detail;
                    if (oldCount === 0 && formElement.hasAttribute("disabled")) {
                        formElement.removeAttribute("disabled");
                    } else if (!this.#searchQuery && newCount === 0) {
                        formElement.setAttribute("disabled", "disabled");
                    }
                });
            }
            return searchLandmarkEl;
        }
        /* Adds search landmark into the header, if it is not there */
        includeSearchLandmark({ fieldName = "query", disableIfNoItems = true } = {}) {
            let landmarkEl = this.header.querySelector("search");
            if (!landmarkEl) {
                landmarkEl = this.releaseSearchLandmark({ fieldName, disableIfNoItems });
                insertAfter(landmarkEl, this.heading);
            }
            return landmarkEl;
        }
    }
    return Mixin;
}