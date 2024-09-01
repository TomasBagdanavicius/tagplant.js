"use strict";

import { createElement, valueToElement } from "../functions/node.js";
import { objectIterator } from "../functions/object.js";
import { WebComponentMixin } from "./web-component-mixin.js";

export function createSlottedTemplate(data) {
    // Mind that template is a special element which works through the document fragment wrapper
    const template = document.createElement("template");
    const slotEls = data.map(element => {
        if (element instanceof HTMLElement) {
            return element;
        }
        const name = element.name ?? element;
        let el = createElement("slot", {
            attrs: { name }
        });
        if (typeof element === "object" && Object.hasOwn(element, "wrapper")) {
            element.wrapper.append(el);
            el = element.wrapper;
            if (Object.hasOwn(element, "partName")) {
                element.wrapper.setAttribute("part", element.partName);
            }
        }
        return el;
    });
    template.content.append(...slotEls);
    return template;
}

export function iterableToSlottedElement(iterable, { tag = "div", refs } = {}) {
    const webComponentEl = createElement(tag);
    for (const [name, value] of iterable) {
        let el;
        if (typeof value === "function") {
            el = value(webComponentEl, name);
        } else if (value !== undefined) {
            el = valueToElement(value);
        }
        // Application closure can return falsy
        if (el) {
            el.setAttribute("slot", name);
            webComponentEl.append(el);
            if (typeof refs === "object") {
                refs[name] = el;
            }
        }
    }
    return webComponentEl;
}

export function objectToSlottedElement(object, { tag = "div", refs } = {}) {
    return iterableToSlottedElement(objectIterator(object), { tag, refs });
}

export function createAndDefineCustomElement(name, { template, throwOnDuplicate = true, webComponentOptions = {} } = {}) {
    if (customElements.get(name)) {
        if (throwOnDuplicate) {
            throw new DOMException(`Custom element with name ${name} is already defined`, "DuplicateError");
        }
    } else {
        customElements.define(name, class extends WebComponentMixin(webComponentOptions) {
            constructor() {
                super();
            }
            connectedCallback() {
                super.connectedCallback(template);
            }
        });
    }
}