"use strict";

import { createElement } from "../core/functions/node.js";
import { validateVarInterface } from "../core/functions/misc.js";
import { EventListenersController } from "../core/events/event-listeners-controller.js";
import { IDMappedCollection } from "../core/collections/id-mapped-collection.js";

export const Template = (() => {
    let templateId = 0;
    return class extends EventTarget {
        #id;
        #data;
        #hashes = new Map;
        constructor(data) {
            super();
            templateId++;
            this.#id = templateId;
            this.#data = data;
        }
        get id() {
            return this.#id;
        }
        get data() {
            return Object.assign({}, this.#data);
        }
        toFragment() {
            const fragment = new DocumentFragment;
            const { nodes } = this.getParts();
            fragment.append(...nodes);
            return fragment;
        }
        registerHashes(hashes) {
            for (const [name, { onEnter, onLeave }] of Object.entries(hashes)) {
                this.registerHash(name, onEnter, onLeave);
            }
        }
        registerHash(name, onEnter, onLeave) {
            if (typeof onEnter !== "function") {
                console.error(`"onEnter" must be a function`);
            }
            if (typeof onLeave !== "function") {
                console.error(`"onLeave" must be a function`);
            }
            this.#hashes.set(name, { onEnter, onLeave });
        }
        unregisterHash(name) {
            if (this.#hashes.has(name)) {
                return this.#hashes.delete(name);
            } else {
                return null;
            }
        }
        hasHash(name) {
            return this.#hashes.has(name);
        }
        *hashes() {
            for (const value of this.#hashes) {
                yield value;
            }
        }
        validateDocument(document) {
            validateVarInterface(document, Document);
            if (document.defaultView === null) {
                throw new DOMException("Document must have associated window");
            }
        }
        bindEvents(document) {
            this.validateDocument(document);
            const view = document.defaultView;
            const listeners = {};
            const controller = new EventListenersController(listeners, [view]);
            controller.add();
            return controller;
        }
        static buildContainerElement(refs) {
            return createElement("div", {
                classes: ["site-container"],
                elems: [{
                    tag: "header",
                    options: {
                        classes: ["site-header"],
                    },
                    ref: "header"
                }, {
                    tag: "main",
                    options: {
                        classes: ["site-main"],
                    },
                    ref: "main"
                }]
            }, refs);
        }
    }
})();

export class TemplateCollection extends IDMappedCollection {
    constructor() {
        super(Template);
    }
}

export const templates = new TemplateCollection;