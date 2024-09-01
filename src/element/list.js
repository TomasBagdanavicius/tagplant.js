"use strict";

import { createElement } from "../core/functions/node.js";
import { validateVarInterface } from "../core/functions/misc.js";
import { enumList, validateEnumMember } from "../core/functions/enumeration.js";
import { Group } from "./group.js";

export class List extends Group {
    static #types = enumList({
        unordered: "unordered",
        ordered: "ordered"
    }, "listTypes");
    static #defaultOptions = {
        keyAsDataId: false
    }
    static #itemTag = "li";
    #options;
    constructor({ type = List.types.unordered, classes = [], options = {} } = {}) {
        validateEnumMember(type, "listTypes");
        const memberBuilder = Group.defaultMemberBuilder;
        memberBuilder.defaultTag = List.#itemTag;
        const tag = type === List.types.unordered ? "ul" : "ol";
        options = { ...List.defaultOptions, ...options };
        super({ memberBuilder, tag, classes, options: {
            keyAsDataId: options.keyAsDataId
        } });
        this.#options = options;
    }
    get types() {
        return List.#types;
    }
    static get types() {
        return List.#types;
    }
    static get defaultOptions() {
        return Object.assign({}, this.#defaultOptions);
    }
    get options() {
        return Object.assign({}, this.#options);
    }
    static get itemTag() {
        return List.#itemTag;
    }
    getItem(key) {
        return this.getByKey(key);
    }
    detachItem(key) {
        return this.detachMember(key);
    }
    reattachItem(key, position) {
        return this.reattachMember(key, position);
    }
    items() {
        return this.members();
    }
    static createItem(node, classes = []) {
        validateVarInterface(node, Node);
        const item = createElement(List.#itemTag, { classes });
        item.appendChild(node);
        return item;
    }
}