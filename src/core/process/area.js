"use strict";

import { findFirstElementWithSmallestDepth, getNodeDepth, isElementActive, onElementRemove } from "../functions/node.js";
import { numericElementSorter } from "../functions/number.js";
import { validateVarInterface } from "../functions/misc.js";
import { ExpiredAbortError } from "../exceptions.js";
import { CancelablePromise } from "./cancelable-promise.js";

export class Area extends EventTarget {
    abortControllers = new Set;
    closeCallbacks = new Set;
    constructor(el) {
        validateVarInterface(el, Element);
        super();
        if (!isElementActive(el)) {
            throw new DOMException("Element must be active");
        }
        this.el = el;
        this.el.classList.add(Area.className);
        onElementRemove(el).then(() => {
            this.close();
            this.dispatchEvent(new CustomEvent("remove"));
        }).catch(error => {
            console.error(error);
        });
        globalAreas.add(this);
    }
    static get className() {
        return "area";
    }
    get element() {
        return this.el;
    }
    provideAbortController() {
        const abortController = new AbortController;
        this.abortControllers.add(abortController);
        abortController.signal.addEventListener("abort", () => {
            this.abortControllers.delete(abortController);
        });
        return abortController;
    }
    abortAll() {
        if (this.abortControllers.size) {
            this.abortControllers.forEach(abortController => {
                if (!abortController.signal.aborted) {
                    // Provide a reason when aborting arbitrarily
                    abortController.abort(new ExpiredAbortError("The operation has expired"));
                }
            });
        }
    }
    addOnRemoveCallback(callback) {
        this.closeCallbacks.add(callback);
    }
    close() {
        this.abortAll();
    }
    remove() {
        this.constructor.removeElement(this.el);
    }
    empty() {
        this.constructor.emptyElement(this.el);
        this.close();
    }
    toCollection() {
        const collection = new AreaCollection;
        collection.add(this);
        return collection;
    }
    static findClosest(el) {
        const className = Area.className;
        return el.classList.contains(className) ? el : el.closest(".".concat(className));
    }
    static removeInnerAreaElements(el) {
        const innerEls = el.getElementsByClassName(Area.className);
        if (innerEls.length) {
            const data = Array.from(innerEls);
            for (const [index, innerEl] of data.entries()) {
                const depth = getNodeDepth(innerEl, el);
                data[index] = { element: innerEl, depth };
            }
            // Sort by "depth" in descending order
            data.sort(numericElementSorter("depth")).reverse();
            for (const element of data) {
                element.element.remove();
            }
        }
    }
    static removeElement(el) {
        Area.removeInnerAreaElements(el);
        el.remove();
    }
    static emptyElement(el) {
        Area.removeInnerAreaElements(el);
        el.replaceChildren();
    }
    static attachedTimeout(el, delay) {
        const area = globalAreas.relative(el);
        let abortController;
        if (area) {
            abortController = area.provideAbortController();
        }
        return new CancelablePromise(resolve => {
            const timeoutId = setTimeout(() => {
                resolve();
            }, delay);
            if (abortController) {
                abortController.signal.addEventListener("abort", () => {
                    clearTimeout(timeoutId);
                });
            }
        }, abortController);
    }
}

export class AreaCollection {
    #map = new Map;
    get length() {
        return this.#map.size;
    }
    add(area) {
        validateVarInterface(area, Area);
        this.#map.set(area.element, area);
        area.addEventListener("remove", () => {
            this.delete(area.element);
        });
    }
    has(el) {
        return this.#map.has(el);
    }
    get(el) {
        return this.#map.get(el);
    }
    delete(el) {
        validateVarInterface(el, Element);
        return this.#map.delete(el);
    }
    first() {
        const first = findFirstElementWithSmallestDepth(document.documentElement, el => el.classList.contains(Area.className));
        if (first && this.has(first)) {
            return this.get(first);
        } else {
            return null;
        }
    }
    relative(el) {
        const closest = Area.findClosest(el);
        if (closest && this.has(closest)) {
            return this.get(closest);
        } else {
            return null;
        }
    }
}

export const globalAreas = new AreaCollection;