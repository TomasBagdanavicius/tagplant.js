"use strict";

import { arrayElementRemove, twoArraysEqual } from "../core/functions/array.js";
import { createSimpleButton } from "../core/functions/node.js";
import { numericElementSorter } from "../core/functions/number.js";
import { objectFilter } from "../core/functions/object.js";
import { Menu } from "./menu.js";

export class ControlsManager extends EventTarget {
    static defaultOptions = {
        remove: true
    };
    #map = {};
    #index = [];
    constructor(config, excludeList, options = {}) {
        super();
        this.config = config;
        this.excludeList = excludeList;
        this.options = { ...this.constructor.defaultOptions, ...options };
        this.reindex();
    }
    get length() {
        return this.#index.length;
    }
    dispatchLengthChangeEvent(lengthBefore) {
        let value = null;
        if (lengthBefore === 0 && this.#index.length !== 0 ) {
            value = true;
        } else if (lengthBefore !== 0 && this.#index.length === 0) {
            value = false;
        }
        if (value !== null) {
            this.dispatchEvent(new CustomEvent("lengthchange", {
                detail: { value }
            }));
        }
    }
    reindex() {
        this.#index = [];
        this.#map = [];
        for (const [name, params] of Object.entries(this.config)) {
            this.addConfig(name, params);
        }
    }
    #add(name, params, { nameAsKey = true } = {}) {
        if (params.active && !this.#index.includes(name)) {
            const lengthBefore = this.#index.length;
            this.#index.push(name);
            this.dispatchLengthChangeEvent(lengthBefore);
        }
        if (this.menu) {
            if (name in this.#map === false) {
                let button = createSimpleButton(params.text);
                button = params.obtainButton(button);
                if (!this.options.remove && !params.active) {
                    button.disabled = true;
                }
                const insertParams = [button, params.position];
                if (nameAsKey) {
                    insertParams.push(name);
                }
                const [, key] = this.menu.insert(...insertParams);
                this.#map[name] = key;
            } else {
                const key = this.#map[name];
                const listItem = this.menu.list.getItem(key);
                listItem.firstElementChild.disabled = false;
            }
        }
    }
    #remove(name) {
        const lengthBefore = this.#index.length;
        const removed = arrayElementRemove(this.#index, name);
        if (removed) {
            this.dispatchLengthChangeEvent(lengthBefore);
        }
        if (this.menu) {
            const key = this.#map[name];
            if (key !== undefined) {
                if (this.options.remove) {
                    this.menu.remove(key);
                    delete this.#map[name];
                } else {
                    const listItem = this.menu.list.getItem(key);
                    listItem.firstElementChild.disabled = true;
                }
            }
        }
    }
    addConfig(name, params) {
        params.connected = false;
        const isIncluded = !this.excludeList.includes(name);
        if (isIncluded && (params.active || !this.options.remove)) {
            this.#add(name, params);
            params.connected = true;
        }
        if (Object.hasOwn(params, "init")) {
            params.init(newStatus => {
                if (newStatus !== params.active) {
                    params.active = newStatus;
                    if (newStatus) {
                        if (!this.excludeList.includes(name)) {
                            this.#add(name, params);
                            params.connected = true;
                        }
                    } else {
                        this.#remove(name);
                        params.connected = false;
                    }
                }
            }, params);
            delete params.init;
        }
    }
    updateExcludeList(excludeList) {
        if (!twoArraysEqual(this.excludeList, excludeList)) {
            this.excludeList = excludeList;
            if (this.menu) {
                this.menu.list.empty();
            }
            this.reindex();
        }
    }
    hasMenu() {
        return this.menu !== undefined;
    }
    getMenu({ title = "Controls", classes = [], host } = {}) {
        if (this.menu) {
            return this.menu;
        }
        const menu = new Menu({ headingText: title, classes, host });
        this.menu = menu;
        const items = this.options.remove
            ? objectFilter(this.config, name => this.#index.includes(name))
            : objectFilter(this.config, name => !this.excludeList.includes(name));
        const array = [];
        for (const [name, params] of Object.entries(items)) {
            params.name = name;
            array.push(params);
        }
        if (array.length > 1) {
            array.sort(numericElementSorter("position"));
        }
        for (const params of array) {
            this.#add(params.name, params);
        }
        return menu;
    }
    destroyMenu() {
        if (this.menu) {
            this.menu.element.remove();
            this.#map = [];
            this.menu = null;
        }
    }
    updateOption(name, value) {
        if (name === "remove") {
            if (typeof value !== "boolean") {
                throw new TypeError(`Option ${name} requires a value of boolean type`);
            }
            if (this.options.remove !== value) {
                if (this.menu) {
                    // Empty keys right away, because `onChildListChange` is called late
                    this.menu.list.empty({ emptyKeys: true });
                }
                this.options.remove = value;
                this.reindex();
            }
        }
    }
}