"use strict";

import { createElement, detachElement, isElementAttached, onConnectedChange, prependChild, onAttributeChange, onChildListChange, insertAdjacentNode, getChildPosition, insertElementAt } from "../functions/node.js";
import { isNullish, validateVarInterface } from "../functions/misc.js";
import { arrayElementRemove } from "../functions/array.js";
import { adjacencyPositions, headingLevels } from "../functions/enumeration.js";

export const ElementChildrenCountable = ({ parentConstructor = ElementRepresentative, countFormula } = {}) => {
    return class extends parentConstructor {
        #countFormula;
        constructor(elem) {
            super(elem);
            this.#countFormula = countFormula;
            this.revisitCount();
            onChildListChange(elem, () => {
                this.revisitCount();
            });
        }
        get countChildren() {
            const count = this.element.children.length;
            if (typeof this.#countFormula === "function") {
                return this.#countFormula(count);
            } else {
                return count;
            }
        }
        revisitCount() {
            let publishedCount;
            if (this.element.hasAttribute("data-count")) {
                publishedCount = parseInt(this.element.getAttribute("data-count"));
            }
            const updatedCount = this.count;
            this.element.setAttribute("data-count", updatedCount);
            if (!isNullish(publishedCount) && publishedCount !== updatedCount) {
                this.dispatchEvent(new CustomEvent("countchange", {
                    detail: { newCount: updatedCount, oldCount: publishedCount }
                }));
            }
        }
        addCountAttrTo(elem) {
            validateVarInterface(elem, Element);
            elem.setAttribute("data-count", "");
            this.updateCountOnAttr(elem.getAttributeNode("data-count"));
        }
        updateCountOnAttr(attr) {
            validateVarInterface(attr, Attr);
            attr.value = this.count;
            this.addEventListener("countchange", e => {
                attr.value = e.detail.newCount;
            });
        }
        updateCountText(elem) {
            elem.textContent = this.count;
            this.addEventListener("countchange", e => {
                elem.textContent = e.detail.newCount;
            });
        }
    }
}

export const MappedChildren = ({ parentConstructor = ElementRepresentative } = {}) => {
    return class extends parentConstructor {
        #map = new Map;
        #index = 0;
        constructor(elem) {
            super(elem);
            // `addedNodes` and `removedNodes` are instances of `NodeList`
            onChildListChange(elem, ({ addedNodes, removedNodes }) => {
                if (addedNodes.length !== 0) {
                    addedNodes = Array.from(addedNodes);
                    for (const { node } of this.#map.values()) {
                        arrayElementRemove(addedNodes, node);
                    }
                    if (addedNodes.length !== 0) {
                        for (const addedNode of addedNodes) {
                            // In case it was immediately detached, because "onChildListChange" might be run in a separate session
                            if (addedNode.parentElement === elem) {
                                this.setChildKey(addedNode);
                            }
                        }
                    }
                }
                if (removedNodes.length !== 0) {
                    removedNodes = Array.from(removedNodes);
                    for (const [key, { node, detached }] of this.#map.entries()) {
                        if (!detached && removedNodes.includes(node)) {
                            this.#map.delete(key);
                        }
                    }
                }
            });
        }
        get keysIndex() {
            return this.#index;
        }
        get dataItemsMap() {
            return new Map(this.#map);
        }
        hasKey(key) {
            return this.#map.has(key);
        }
        getByKey(key) {
            const element = this.#getElement(key);
            if (!element) {
                return null;
            }
            return element.node;
        }
        #getElement(key) {
            return this.#map.get(key);
        }
        validateChildNode(node) {
            if (node.parentElement !== this.element) {
                throw new DOMException("Node must be a child of the fundamental element");
            }
        }
        getKey(node) {
            this.validateChildNode(node);
            for (const [key, { node: value }] of this.#map.entries()) {
                if (value === node) {
                    return key;
                }
            }
            return null;
        }
        *namedChildren() {
            for (const [key, { node }] of this.#map.entries()) {
                yield [key, node];
            }
        }
        *dataItems() {
            for (const [, { data }] of this.#map.entries()) {
                yield data;
            }
        }
        validateCustomKey(key) {
            if (!isNullish(key)) {
                const type = typeof key;
                if (type !== "string" && type !== "number") {
                    throw new TypeError("Custom key must be either a string or a number");
                }
                if (this.hasKey(key)) {
                    throw new DOMException(`Key "${key}" is taken`);
                }
            }
        }
        #grantNextKey() {
            if (this.#index === 0) {
                this.#index++;
                return 0;
            } else {
                const key = this.#index;
                this.#index++;
                return key;
            }
        }
        #assignKey(key) {
            if (!isNullish(key)) {
                this.validateCustomKey(key);
            } else {
                key = this.#grantNextKey();
            }
            return key;
        }
        setChildKey(node, { key, data = {} } = {}) {
            this.validateChildNode(node);
            const findKey = this.getKey(node);
            if (findKey !== null) {
                throw new DOMException(`Node already has a key assigned ${findKey}`);
            }
            key = this.#assignKey(key);
            this.#map.set(key, { node, data });
            this.dispatchEvent(new CustomEvent("setnodekey", {
                detail: { node, key, data }
            }));
            return key;
        }
        getChildData(key) {
            if (this.hasKey(key)) {
                const element = this.#map.get(key);
                return Object.assign({}, element.data);
            }
        }
        modifyChildData(key, data, { merge = true } = {}) {
            if (this.hasKey(key)) {
                const element = this.#map.get(key);
                if (merge) {
                    element.data = { ...element.data, ...data };
                } else {
                    element.data = data;
                }
                this.#map.set(key, element);
            }
        }
        removeByKey(key) {
            if (!this.hasKey(key)) {
                return false;
            }
            const { node } = this.#map.get(key);
            node.remove();
            this.#map.delete(key);
            return true;
        }
        emptyKeys() {
            this.#map.clear();
        }
        detachChildByKey(key) {
            if (this.hasKey(key)) {
                const element = this.#map.get(key);
                element.detached = true;
                element.lastDetachPosition = getChildPosition(this.element, element.node);
                this.#map.set(key, element);
                return detachElement(element.node);
            }
        }
        reattachChildByKey(key, position) {
            if (this.hasKey(key)) {
                const element = this.#map.get(key);
                if ("detached" in element && element.detached) {
                    const { node, lastDetachPosition } = element;
                    const reattachPosition = position || lastDetachPosition || this.element.children.length;
                    delete element.detached;
                    delete element.lastDetachPosition;
                    this.#map.set(key, element);
                    return insertElementAt(this.element, node, reattachPosition);
                }
            }
        }
    }
}

export class ElementRepresentative extends EventTarget {
    #el;
    constructor(el) {
        if (el.isConnected) {
            throw new DOMException("Element must not be connected");
        }
        super();
        const controller = onConnectedChange(el);
        el.addEventListener("connected", () => {
            this.dispatchEvent(new CustomEvent("connectedfirst"));
            controller.removeObserver();
        }, { once: true });
        this.#el = el;
    }
    get element() {
        return this.#el;
    }
    get isAttached() {
        return isElementAttached(this.element);
    }
    get isDetached() {
        return !this.isAttached;
    }
    getElement() {
        return this.element;
    }
    detach() {
        return this.isAttached
            ? detachElement(this.element)
            : null;
    }
    attach(reference, { adjacency = adjacencyPositions.afterbegin } = {}) {
        if (this.isDetached) {
            insertAdjacentNode(reference, adjacency, this.element);
        }
    }
    prependTo(elem) {
        elem.prepend(this.element);
    }
    prependToBody(doc) {
        doc = doc || document;
        return prependChild(doc.body, this.element);
    }
    appendTo(elem) {
        elem.append(this.element);
    }
    appendToBody(doc) {
        doc = doc || document;
        return doc.body.appendChild(this.element);
    }
    constrainAttributeToList(attrName, list, currentElementGetter, callback) {
        onAttributeChange(this.#el, attrName, ({ newValue }) => {
            let element;
            const currentElement = currentElementGetter();
            try {
                element = list[newValue];
            } catch {
                this.#el.setAttribute(attrName, currentElement.value);
            }
            if (element && element !== currentElement) {
                callback(element);
            }
        });
    }
    static getStandardFooterSchema(classes) {
        return {
            tag: "footer",
            options: { classes },
            ref: "footer"
        };
    }
    static getStandardHeaderSchema(title, { classes, headingLevel = headingLevels.two, headingClasses } = {}) {
        return {
            tag: "header",
            options: {
                classes,
                elems: [{
                    tag: headingLevel.value,
                    options: {
                        text: title,
                        classes: headingClasses
                    },
                    ref: "heading"
                }]
            },
            ref: "header"
        };
    }
    static createStandardCarcass(obj, tag, title, { classes = [], attrs, headingLevel = headingLevels.two, includeFooter = false, includeBody = false, refs = {} } = {}) {
        const elems = [obj.getHeaderSchema(title, headingLevel)];
        if (includeBody && "getBodySchema" in obj) {
            elems.push(obj.getBodySchema());
        }
        if (includeFooter && "getFooterSchema" in obj) {
            elems.push(obj.getFooterSchema());
        }
        const element = createElement(tag, { classes, attrs, elems }, refs);
        return [element, refs];
    }
}