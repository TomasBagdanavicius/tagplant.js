"use strict";

import { createElement, prependChild, onAttributeChange } from "../functions/node.js";

export const WebComponentMixin = ({
    ElInterface = HTMLElement,
    mode = "open",
    options = {}
} = {}) => {
    return class extends ElInterface {
        static observedAttributes = ["stylesheet"];
        static defaultOptions = {
            observeStylesheet: false,
            mimicRootAttributes: ["data-theme"],
        };
        #wasConnected = false;
        #mainStylesheet;
        afterConnectedAttrCallbacks = {};
        #isConnected = false;
        #mimicRootAttributesControllers = new Set;
        constructor() {
            super().attachShadow({ mode });
            this.options = { ...this.constructor.defaultOptions, ...options };
            // Force include default values.
            for (const attrName of this.constructor.defaultOptions.mimicRootAttributes) {
                if (!this.options.mimicRootAttributes.includes(attrName)) {
                    this.options.mimicRootAttributes.push(attrName);
                }
            }
        }
        attributeChangedCallback(name, oldValue, newValue) {
            if (name === "stylesheet" && this.options.observeStylesheet) {
                if (this.#mainStylesheet) {
                    this.#mainStylesheet.remove();
                }
                if (newValue) {
                    this.#mainStylesheet = this.addExternalStylesheet(newValue);
                }
            }
            if (Object.hasOwn(this.afterConnectedAttrCallbacks, name)) {
                if (!this.wasConnected) {
                    this.addEventListener("connected", () => {
                        this.#runAfterConnectedAttrCallbacks(name, oldValue, newValue);
                    }, { once: true });
                } else {
                    this.#runAfterConnectedAttrCallbacks(name, oldValue, newValue);
                }
            }
        }
        addAfterConnectedAttrCallback(attrName, callback) {
            if (!Object.hasOwn(this.afterConnectedAttrCallbacks, attrName)) {
                this.afterConnectedAttrCallbacks[attrName] = [callback];
            } else {
                this.afterConnectedAttrCallbacks[attrName].push(callback);
            }
        }
        #runAfterConnectedAttrCallbacks(name, oldValue, newValue) {
            if (Object.hasOwn(this.afterConnectedAttrCallbacks, name)) {
                for (const callback of this.afterConnectedAttrCallbacks[name]) {
                    callback(newValue, oldValue, name);
                }
            }
        }
        connectedCallback(template) {
            this.#isConnected = true;
            this.#wasConnected = true;
            if (template) {
                const clonedNode = template.content.cloneNode(true);
                this.shadowRoot.appendChild(clonedNode);
            }
            this.dispatchEvent(new CustomEvent("connected", {
                detail: { shadowRoot: this.shadowRoot, template }
            }));
            for (const attrName of this.options.mimicRootAttributes) {
                const rootValue = document.documentElement.getAttribute(attrName);
                if (rootValue !== null) {
                    this.setAttribute(attrName, rootValue);
                }
                const rootController = onAttributeChange(document.documentElement, attrName, ({ newValue }) => {
                    if (newValue === null) {
                        this.removeAttribute(attrName);
                    } else {
                        this.setAttribute(attrName, newValue);
                    }
                });
                const localController = onAttributeChange(this, attrName, ({ newValue }) => {
                    const rootValue = document.documentElement.getAttribute(attrName);
                    if (rootValue !== null && newValue !== rootValue) {
                        this.setAttribute(attrName, rootValue);
                    }
                });
                this.#mimicRootAttributesControllers.add(rootController).add(localController);
            }
            this.classList.add("custom-element");
        }
        disconnectedCallback() {
            this.#isConnected = false;
            const isRemoved = this.parentElement === null;
            this.dispatchEvent(new CustomEvent("disconnected", {
                detail: { shadowRoot: this.shadowRoot, isRemoved }
            }));
            if (isRemoved) {
                this.dispatchEvent(new CustomEvent("removed", {
                    detail: { shadowRoot: this.shadowRoot }
                }));
            }
            for (const controller of this.#mimicRootAttributesControllers) {
                controller.unobserve();
            }
            for (const attrName of this.options.mimicRootAttributes) {
                this.removeAttribute(attrName);
            }
        }
        get wasConnected() {
            return this.#wasConnected;
        }
        get isConnected() {
            return this.#isConnected;
        }
        get mainStylesheet() {
            return this.#mainStylesheet;
        }
        addExternalStylesheet(url, attrs = {}) {
            const linkEl = createElement("link", {
                attrs: {
                    ...attrs,
                    rel: "stylesheet",
                    href: url,
                }
            });
            return this.insertElementAfterStylesheets(linkEl);
        }
        insertElementAfterStylesheets(element) {
            for (const child of this.shadowRoot.children) {
                if (child.localName === "link") {
                    continue;
                }
                return this.shadowRoot.insertBefore(element, child);
            }
            return this.shadowRoot.appendChild(element);
        }
        addInternalStyles(styles) {
            const style = document.createElement("style");
            style.textContent = styles;
            return prependChild(this.shadowRoot, style);
        }
        removeNonLinkChildrenInShadowRoot() {
            for (const child of this.shadowRoot.children) {
                if (child.localName !== "link") {
                    child.remove();
                }
            }
        }
    }
}