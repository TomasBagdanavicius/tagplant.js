"use strict";

import { camelCaseToKebabCase, stringContainsNumbersOnly } from "../core/functions/string.js";
import { createElement, insertElementAt, isElementAttached, iterableToElement, onChildListChange, prependChild, valueToElement } from "../core/functions/node.js";
import { isIterable, isNullish } from "../core/functions/misc.js";
import { isNonNullObject, objectIterator } from "../core/functions/object.js";
import { ElementChildrenCountable, MappedChildren } from "../core/element/element-representative.js";
import { iterableToSlottedElement } from "../core/web-component/functions.js";

export class Group extends MappedChildren({ parentConstructor: ElementChildrenCountable() }) {
    static #defaultOptions = {
        keyAsDataId: false
    }
    #options;
    #builder;
    #onMemberRemoveCallbacks = new Map;
    constructor({
        memberBuilder = Group.defaultMemberBuilder,
        tag = "div",
        classes = [],
        options = {},
    } = {}) {
        const el = Group.createCarcass({ tag, classes });
        super(el);
        this.#options = { ...Group.#defaultOptions, ...options };
        this.#builder = memberBuilder;
        onChildListChange(el, ({ removedNodes }) => {
            if (removedNodes.length) {
                for (const removedNode of removedNodes.values()) {
                    if (this.#onMemberRemoveCallbacks.has(removedNode)) {
                        const callbacks = this.#onMemberRemoveCallbacks.get(removedNode);
                        for (const callback of callbacks) {
                            callback();
                        }
                        this.#onMemberRemoveCallbacks.delete(removedNode);
                    }
                }
            }
        });
        this.addEventListener("setnodekey", e => {
            if (this.#options.keyAsDataId) {
                const { node, key } = e.detail;
                node.setAttribute("data-id", key);
            }
        });
    }
    static get defaultOptions() {
        return Object.assign({}, this.#defaultOptions);
    }
    get options() {
        return Object.assign({}, this.#options);
    }
    get count() {
        return this.countChildren;
    }
    has(key) {
        return this.hasKey(key);
    }
    get(key) {
        return this.getByKey(key);
    }
    createMember(element, key, { keyToDataset = true, keyToClasses = true, classes = [] } = {}) {
        const member = this.#builder.build(element, key);
        if (keyToDataset && !isNullish(key) && key !== false) {
            member.dataset.name = key;
        }
        if (keyToClasses && (key || key === 0)) {
            let className = key;
            if (typeof className === "string") {
                className = camelCaseToKebabCase(key);
            }
            if (typeof className === "number"
                || (typeof className === "string" && stringContainsNumbersOnly(className))
            ) {
                className = `class-${className}`;
            }
            member.classList.add(className);
        }
        if (classes.length !== 0) {
            member.classList.add(...classes);
        }
        return member;
    }
    *members() {
        for (const member of this.element.children) {
            yield member;
        }
    }
    prependMember(member, customKey) {
        prependChild(this.element, member);
        const key = this.setChildKey(member, {
            key: customKey,
            data: { originalPosition: 0 }
        });
        return [member, key];
    }
    prepend(element, customKey, { keyToDataset, keyToClasses, classes = [] } = {}) {
        const member = this.createMember(element, customKey, { keyToDataset, keyToClasses, classes });
        return this.prependMember(member, customKey);
    }
    appendMember(member, customKey) {
        this.element.appendChild(member);
        const key = this.setChildKey(member, {
            key: customKey,
            data: { originalPosition: Math.max(0, this.countChildren - 1) }
        });
        return [member, key];
    }
    append(element, customKey, { keyToDataset, keyToClasses, classes = [] } = {}) {
        const member = this.createMember(element, customKey, { keyToDataset, keyToClasses, classes });
        return this.appendMember(member, customKey);
    }
    insertMember(member, position, customKey) {
        insertElementAt(this.element, member, position);
        const key = this.setChildKey(member, {
            key: customKey,
            data: { originalPosition: position }
        });
        return [member, key];
    }
    insert(element, position, customKey, { keyToDataset, keyToClasses, classes = [] } = {}) {
        const member = this.createMember(element, customKey, { keyToDataset, keyToClasses, classes });
        return this.insertMember(member, position, customKey);
    }
    remove(key) {
        const member = this.getByKey(key);
        if (!member) {
            return null;
        }
        this.removeByKey(key);
        return false;
    }
    empty({ emptyKeys = false } = {}) {
        if (this.count !== 0) {
            this.element.replaceChildren();
            if (emptyKeys) {
                this.emptyKeys();
            }
        }
    }
    detachMember(key) {
        return this.detachChildByKey(key);
    }
    reattachMember(key, position) {
        return this.reattachChildByKey(key, position);
    }
    isMemberAttached(key) {
        const member = this.get(key);
        if (member === null) {
            return null;
        }
        return isElementAttached(member);
    }
    onMemberRemove(key, callback) {
        if (this.hasKey(key)) {
            const member = this.getByKey(key);
            if (!this.#onMemberRemoveCallbacks.has(member)) {
                this.#onMemberRemoveCallbacks.set(member, [callback]);
            } else {
                const callbacks = this.#onMemberRemoveCallbacks.get(member);
                callbacks.push(callback);
                this.#onMemberRemoveCallbacks.set(member, callbacks);
            }
        }
    }
    removePortion(startIndex, endIndex) {
        if (endIndex < startIndex) {
            throw new TypeError("End index must be smaller than start index");
        }
        if (typeof endIndex !== "number") {
            endIndex = this.count - 1;
        }
        if (startIndex <= this.count - 1) {
            for (let i = endIndex; i >= startIndex; i--) {
                this.element.removeChild(this.element.children[i]);
            }
        }
    }
    changeMemberBuilder(newMemberBuilder) {
        this.#builder = newMemberBuilder;
    }
    static createCarcass({ tag = "div", classes = [] } = {}) {
        return createElement(tag, { classes: ["group", ...classes] });
    }
    static get defaultMemberBuilder() {
        return {
            defaultTag: "div",
            iterableToElement: iterableToElement,
            // Defines a tagname, when a wrapper is required for text node element, or an element that begins with a text node
            textElementWrapper: undefined,
            build(element) {
                const type = typeof element;
                let member = createElement(this.defaultTag);
                let iterable;
                const getHost = () => {
                    if (this.textElementWrapper) {
                        const host = createElement(this.textElementWrapper);
                        member.append(host);
                        return host;
                    } else {
                        return member;
                    }
                }
                if (type === "string") {
                    getHost().textContent = element;
                } else if (Group.hasGroupMemberMethod(element)) {
                    member = element.toGroupMember();
                } else if (element instanceof Node) {
                    switch (element.nodeType) {
                        case Node.DOCUMENT_FRAGMENT_NODE:
                            if (element.firstChild.nodeType === Node.TEXT_NODE) {
                                getHost().append(element);
                            } else {
                                member.append(element);
                            }
                        break;
                        default:
                            member.append(element);
                    }
                } else if (isIterable(element)) {
                    iterable = element;
                } else if (type === "object") {
                    iterable = Object.values(element);
                } else {
                    throw new DOMException("Unsupported element type");
                }
                if (iterable) {
                    member = this.iterableToElement(iterable, member);
                }
                return member;
            }
        };
    }
    static get customElementMemberBuilder() {
        return {
            customElementName: "div",
            build(element) {
                let iterable;
                if (isIterable(element)) {
                    iterable = element;
                } else if (typeof element === "object") {
                    iterable = objectIterator(element);
                } else {
                    throw new DOMException("Unsupported element type");
                }
                return iterableToSlottedElement(iterable, { tag: this.customElementName });
            }
        }
    }
    static get chunkBuilder() {
        return {
            chunkNames: null,
            addNameToClasses: false,
            build(element) {
                const member = createElement("div");
                const cells = [];
                for (const [name, value] of Object.entries(element)) {
                    cells.push(this.buildCell(name, value));
                }
                member.append(...cells);
                return member;
            },
            buildCell(name, value) {
                const options = {
                    attrs: { "data-name": name },
                };
                if (Object.hasOwn(this, "chunkNames")
                    && isNonNullObject(this.chunkNames)
                    && Object.hasOwn(this.chunkNames, name)) {
                    options.attrs["data-title"] = this.chunkNames[name];
                }
                if (this.addNameToClasses) {
                    options.classes = [name];
                }
                const cell = createElement("div", options);
                if (typeof value === "function") {
                    value(cell);
                } else if (!isNullish(value)) {
                    if (isNonNullObject(value) && Object.hasOwn(value, "value")) {
                        cell.append(value.value);
                    } else if (value instanceof DocumentFragment) {
                        cell.append(value);
                    } else {
                        cell.innerHTML = value;
                    }
                }
                return cell;
            }
        }
    }
    static get classedItemsBuilder() {
        return {
            addNameToAttributes: false,
            build(element) {
                const member = createElement("div");
                const items = [];
                for (const [name, value] of Object.entries(element)) {
                    member.append(this.buildItem(name, value));
                }
                member.append(...items);
                return member;
            },
            buildItem(name, value) {
                let item;
                if (typeof value !== "function") {
                    item = valueToElement(value);
                } else {
                    item = value();
                }
                item.classList.add(name);
                if (this.addNameToAttributes) {
                    item.dataset.name = name;
                }
                return item;
            }
        }
    }
    static hasGroupMemberMethod(value) {
        return (
            typeof value === "object"
            && value !== null
            // "in" operator is the correct way to check
            && "toGroupMember" in value
            && typeof value.toGroupMember === "function"
        );
    }
}