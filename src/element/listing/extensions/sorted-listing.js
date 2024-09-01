"use strict";

import { objectFilterByKeys } from "../../../core/functions/object.js";
import { isNullish } from "../../../core/functions/misc.js";
import { sortDirection } from "../../../core/functions/enumeration.js";
import { createSimpleButton, removeClasses } from "../../../core/functions/node.js";
import { EventListenersController } from "../../../core/events/event-listeners-controller.js";
import { Menu } from "../../menu.js";

export const SortedListing = ({ parentConstructor, naturalOrder = false } = {}) => {
    const orderValues = {};
    if (naturalOrder) {
        orderValues.natural = "Natural";
    }
    for (const { name, value } of Object.values(sortDirection)) {
        orderValues[name] = value;
    }
    const Mixin = class extends parentConstructor {
        static #defaultOptions = {
            sortable: true,
            sortValues: undefined,
            relevanceKey: undefined,
            headItemSort: undefined,
        };
        #options;
        #sortValues;
        #relevanceKey;
        constructor(title, options) {
            super(title, options);
            this.#options = objectFilterByKeys(options, Mixin.#defaultOptions);
            if (this.#options.sortable) {
                this.registerSearchParams([{
                    name: "order",
                    type: "menu",
                    values: orderValues,
                    controlBuilder: this.releaseOrderMenu.bind(this),
                }, {
                    name: "sort",
                    type: "menu",
                    controlBuilder: this.releaseSortMenu.bind(this),
                }]);
                this.#sortValues = this.#options.sortValues;
                this.addEventListener("requestparams", e => {
                    const { params, requestParams } = e.detail;
                    if (
                        "sort" in params
                        && !isNullish(params.sort)
                        && (isNullish(params.order) || params.order === "natural")
                        && this.hasNaturalOrder
                        && requestParams.order === "natural"
                    ) {
                        params.order = "asc";
                    }
                    if (
                        this.hasNaturalOrder
                        && "order" in params
                        && params.order === "natural"
                        && !params.sort
                        && !isNullish(this.searchParams.sort)
                    ) {
                        params.sort = undefined;
                    }
                });
                if ("relevanceKey" in this.#options) {
                    this.#relevanceKey = this.#options.relevanceKey;
                }
                let activeHeadItem;
                let activeHeadItemButton;
                const headItemControllers = new Map;
                const createHeadItemMenu = (headItem, name) => {
                    const thisSort = this.searchParams.sort === name;
                    const menu = new Menu({
                        headingText: "Options", host: headItem, classes: ["sort-menu"]
                    });
                    const [, , ascButton] = menu.appendButton("ASC", "asc-order", {
                        classes: ["asc-direction-button"]
                    });
                    const [, , descButton] = menu.appendButton("DESC", "desc-order", {
                        classes: ["desc-direction-button"]
                    });
                    ascButton.addEventListener("click", () => {
                        this.setSearchParams({ order: "asc", sort: name });
                    });
                    if (this.searchParams.order === "asc" && thisSort) {
                        ascButton.disabled = true;
                        activeHeadItemButton = ascButton;
                    }
                    descButton.addEventListener("click", () => {
                        this.setSearchParams({ order: "desc", sort: name });
                    });
                    if (this.searchParams.order === "desc" && thisSort) {
                        descButton.disabled = true;
                        activeHeadItemButton = descButton;
                    }
                    if (this.itemCount === 0) {
                        ascButton.disabled = true;
                        descButton.disabled = true;
                    }
                    this.group.addEventListener("countchange", e => {
                        const { newCount, oldCount } = e.detail;
                        if (oldCount === 0) {
                            if (activeHeadItemButton !== ascButton) {
                                ascButton.disabled = false;
                            }
                            if (activeHeadItemButton !== descButton) {
                                descButton.disabled = false;
                            }
                        } else if (newCount === 0) {
                            ascButton.disabled = true;
                            descButton.disabled = true;
                        }
                    });
                    if (thisSort) {
                        activeHeadItem = headItem;
                    }
                    menu.appendTo(headItem);
                }
                const toggleSortHandler = (toggler, name) => {
                    const args = [
                        () => {
                            let order;
                            if (this.searchParams.sort === name) {
                                const oppositeOrder = this.searchParams.order === "asc"
                                    ? "desc"
                                    : "asc";
                                order = oppositeOrder;
                            } else {
                                order = "asc";
                            }
                            const cancelablePromise = this.setSearchParams({ order, sort: name });
                            if (toggler.localName === "button"
                                && cancelablePromise.process
                                && cancelablePromise.process.isRunning) {
                                toggler.disabled = true;
                                cancelablePromise.process.addEventListener("ended", () => {
                                    toggler.disabled = false;
                                });
                            }
                        }
                    ];
                    const listeners = {
                        click: {
                            type: "click",
                            args
                        }
                    };
                    return new EventListenersController(listeners, toggler, { autoadd: true });
                }
                const createHeadItemToggler = (headItem, name) => {
                    const thisSort = this.searchParams.sort === name;
                    const button = createSimpleButton(headItem.innerText, ["sort-toggler-button"]);
                    toggleSortHandler(button, name);
                    if (thisSort) {
                        activeHeadItemButton = button;
                    }
                    if (this.itemCount === 0) {
                        button.disabled = true;
                    }
                    this.group.addEventListener("countchange", e => {
                        const { newCount, oldCount } = e.detail;
                        if (oldCount === 0) {
                            button.disabled = false;
                        } else if (newCount === 0) {
                            button.disabled = true;
                        }
                    });
                    if (thisSort) {
                        activeHeadItem = headItem;
                    }
                    headItem.append(button);
                }
                this.addEventListener("headitemcreate", e => {
                    if (this.#sortValues) {
                        const { headItem, name } = e.detail;
                        if (name in this.#sortValues) {
                            if (this.#options.headItemSort === "button") {
                                createHeadItemToggler(headItem, name);
                            } else if (this.#options.headItemSort === "menu") {
                                createHeadItemMenu(headItem, name);
                            } else {
                                const controller = toggleSortHandler(headItem, name);
                                headItemControllers.set(headItem, controller);
                                headItem.classList.add("clickable");
                            }
                        }
                    }
                });
                this.addEventListener("searchparamsapplied", e => {
                    if (this.head) {
                        const { searchParams } = e.detail;
                        let foundHeadItem = false;
                        if (!isNullish(searchParams.sort) && !isNullish(searchParams.order)) {
                            const selector = `[data-name="${searchParams.sort}"]`;
                            const headItem = this.head.querySelector(selector);
                            if (headItem) {
                                let button;
                                if (this.#options.headItemSort === "button") {
                                    button = headItem.querySelector(`.sort-toggler-button`);
                                } else if (this.#options.headItemSort === "menu") {
                                    const className = searchParams.order.concat("-direction-button");
                                    button = headItem.querySelector(`.${className}`);
                                    button.disabled = true;
                                    if (activeHeadItemButton && activeHeadItemButton !== button) {
                                        activeHeadItemButton.disabled = false;
                                    }
                                }
                                if (button) {
                                    activeHeadItemButton = button;
                                }
                                foundHeadItem = true;
                                if (activeHeadItem) {
                                    activeHeadItem.removeAttribute("data-order");
                                }
                                activeHeadItem = headItem;
                                activeHeadItem.dataset.order = searchParams.order;
                            }
                        }
                        if (!foundHeadItem && activeHeadItemButton && this.itemCount !== 0) {
                            activeHeadItemButton.disabled = false;
                            activeHeadItemButton = undefined;
                        }
                    }
                });
                this.addEventListener("registersortvalues", e => {
                    if (this.head) {
                        const { values } = e.detail;
                        for (const headItem of this.head.children) {
                            const inValues = headItem.dataset.name in values;
                            if (this.#options.headItemSort === "button") {
                                const togglerButton = headItem.querySelector(".sort-toggler-button");
                                if (togglerButton && !inValues) {
                                    togglerButton.remove();
                                } else if (!togglerButton && inValues) {
                                    createHeadItemToggler(headItem, headItem.dataset.name);
                                }
                            } else if (this.#options.headItemSort === "menu") {
                                const menuElem = headItem.querySelector(".sort-menu");
                                if (menuElem && !inValues) {
                                    menuElem.remove();
                                } else if (!menuElem && inValues) {
                                    createHeadItemMenu(headItem, headItem.dataset.name);
                                }
                            } else {
                                const controller = headItemControllers.get(headItem);
                                if (!inValues && controller) {
                                    controller.remove();
                                    removeClasses(headItem, ["clickable"]);
                                    headItemControllers.delete(headItem);
                                } else if (!controller) {
                                    const controller = toggleSortHandler(headItem, name);
                                    headItemControllers.set(headItem, controller);
                                    headItem.classList.add("clickable");
                                }
                            }
                        }
                    }
                });
            }
        }
        static get collectiveOptions() {
            return { ...parentConstructor.collectiveOptions, ...this.#defaultOptions };
        }
        get hasNaturalOrder() {
            return naturalOrder;
        }
        set relevanceKey(value) {
            this.#relevanceKey = value;
        }
        get isRelevanceInSortValues() {
            if (isNullish(this.#relevanceKey)) {
                return false;
            }
            const config = this.getSearchParamConfig("sort");
            return "values" in config && this.#relevanceKey in config.values;
        }
        get relevanceKey() {
            return this.#relevanceKey;
        }
        registerSortValues(values) {
            this.#sortValues = values;
            const sortConfig = this.getSearchParamConfig("sort");
            sortConfig.values = values;
            this.dispatchEvent(new CustomEvent("registersortvalues", {
                detail: { values }
            }));
        }
        releaseOrderMenu({ menuOptions } = {}) {
            const menu = this.buildControlFromData({
                type: "menu",
                values: orderValues,
                processName: "listingorder",
                processTitle: "Listing Order",
                requiresItems: true
            }, "order", { title: "Order", menuOptions });
            const changeButtonState = (state) => {
                for (const [key, listItem] of menu.list.namedChildren()) {
                    if (key !== "natural") {
                        const button = listItem.querySelector("button");
                        if (button) {
                            button.disabled = !state;
                        }
                    }
                }
            }
            if (this.hasNaturalOrder) {
                if (!this.searchParams.sort && this.#options.sortValues) {
                    changeButtonState(false);
                }
                this.group.addEventListener("countchange", e => {
                    if (!this.searchParams.sort && this.#options.sortValues) {
                        const { oldCount } = e.detail;
                        if (oldCount === 0) {
                            changeButtonState(false);
                        }
                    }
                });
                this.addEventListener("searchparamsapplied", e => {
                    const { searchParams } = e.detail;
                    if ("sort" in searchParams && !("order" in searchParams) && !isNullish(searchParams.sort)) {
                        changeButtonState(true, searchParams.sort);
                    }
                    if (
                        "order" in searchParams
                        && searchParams.order === "natural"
                        && this.#options.sortValues
                    ) {
                        changeButtonState(false);
                    }
                });
            }
            return menu;
        }
        releaseSortMenu({ menuOptions } = {}) {
            const menu = this.buildControlFromData({
                type: "menu",
                values: this.#sortValues,
                processName: "listingsort",
                processTitle: "Listing Sort",
                requiresItems: true,
            }, "sort", { title: "Sort", menuOptions });
            this.addEventListener("registersortvalues", e => {
                menu._populator(e.detail.values, { ignoreDuplicates: true });
            });
            return menu;
        }
    }
    return Mixin;
}