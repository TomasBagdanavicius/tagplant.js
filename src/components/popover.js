"use strict";

import { createElement, createSimpleButton, elementAssignUniqueId } from "../core/functions/node.js";
import { mergeOptions } from "../core/functions/object.js";
import { elementApplyTopLeftOffset } from "../core/geometry/functions.js";
import { enumList } from "../core/functions/enumeration.js";
import { unsetCSSProperties } from "../core/functions/style.js";
import { Area } from "../core/process/area.js";
import { documentClickRegistry } from "../core/functions/misc.js";

export const popoverMixin = () => {
    return class {
        #popoverEl;
        #relEl;
        #position;
        constructor(el, relEl, position) {
            this.#popoverEl = el;
            this.#relEl = relEl;
            this.#position = position;
        }
        get shown() {
            return this.#popoverEl.matches(":popover-open");
        }
        get element() {
            return this.#popoverEl;
        }
        show(position) {
            position = position || this.#position;
            // Show before applying position attributes.
            this.#popoverEl.showPopover();
            if (position && this.#relEl) {
                elementApplyTopLeftOffset(this.#popoverEl, this.#position, this.#relEl, true);
            }
            if (this.#relEl) {
                this.#relEl.classList.add("active");
            }
        }
        hide() {
            this.#popoverEl.hidePopover();
            if (this.#relEl) {
                this.#relEl.classList.remove("active");
            }
        }
        toggle() {
            if (this.shown) {
                this.hide();
            } else {
                this.show();
            }
        }
        removePositionStyles() {
            unsetCSSProperties(this.#popoverEl, ["inset"]);
        }
    }
}

export class ManualPopover extends popoverMixin() {
    static #defaultOptions = {
        showImmediately: true,
        toggler: null,
        lightDismiss: true,
        position: false
    };
    #fundamentalStates = enumList({
        constructed: "constructed",
        destructed: "destructed"
    }, "fundamentalStates");
    #el;
    #assignedId;
    #listeners = [];
    #fundamentalState;
    #suspendNextLightDismiss = false;
    constructor(el, options = {}) {
        const allOptions = { ...ManualPopover.defaultOptions, ...options };
        super(el, allOptions.toggler, allOptions.position);
        this.options = allOptions;
        this.#el = el;
        this.#el.popover = "manual";
        const { showImmediately, toggler, lightDismiss } = this.options;
        if (showImmediately) {
            this.show();
        }
        if (toggler) {
            const eventHandlerArgs = [
                () => {
                    if (el.isConnected) {
                        this.toggle();
                    } else {
                        toggler.removeEventListener("click", ...eventHandlerArgs);
                    }
                }
            ];
            this.#listeners.push({
                type: "click",
                args: eventHandlerArgs,
                el: toggler
            });
        }
        if (lightDismiss) {
            documentClickRegistry.register(e => {
                const realTarget = !e.target.shadowRoot ? e.target : e.composedPath()[0];
                if (!this.#suspendNextLightDismiss) {
                    if (
                        !el.contains(realTarget)
                        && this.shown
                        && (!toggler || !toggler.contains(realTarget))
                    ) {
                        this.hide();
                    }
                } else {
                    this.#suspendNextLightDismiss = false;
                }
            }, { capture: true, passive: true });
        }
        this.#construct();
    }
    get fundamentalStates() {
        return this.#fundamentalStates;
    }
    get fundamentalState() {
        return this.#fundamentalState;
    }
    static get defaultOptions() {
        return ManualPopover.#defaultOptions;
    }
    #construct() {
        if (!this.#el.id) {
            this.#assignedId = elementAssignUniqueId(this.#el, "popover");
        }
        for (const { type, args, el } of this.#listeners) {
            el.addEventListener(type, ...args);
            if (type === "click" && el !== document && el !== document.body) {
                el.classList.add("clickable");
            }
        }
        this.#fundamentalState = this.#fundamentalStates.constructed;
    }
    #destruct() {
        this.#el.removeAttribute("popover");
        for (const { type, args, el } of this.#listeners) {
            el.removeEventListener(type, ...args);
            if (type === "click" && el !== document && el !== document.body) {
                el.classList.remove("clickable");
            }
        }
        if (this.#assignedId) {
            this.#el.removeAttribute("id");
        }
        this.removePositionStyles();
        this.#fundamentalState = this.#fundamentalStates.destructed;
    }
    toggleFundamentals() {
        if (this.#fundamentalState === this.#fundamentalStates.constructed) {
            this.#destruct();
        } else {
            this.#construct();
        }
    }
    suspendNextLightDismiss() {
        this.#suspendNextLightDismiss = true;
    }
}

export class Popup extends popoverMixin() {
    static #defaultOptions = {
        title: null,
        position: false,
        relative: null,
        toggler: null,
        onClose: undefined,
        includeCloseButton: true,
        classes: ["popup"],
    }
    #el;
    #options;
    #body;
    constructor(content, options = {}) {
        options = mergeOptions(Popup.#defaultOptions, options, ["classes"]);
        const [popup, refs] = Popup.createCarcass(options.title, {
            includeCloseButton: options.includeCloseButton,
            classes: options.classes,
        });
        super(popup, options.relative, options.position);
        this.#options = options;
        this.#el = popup;
        refs.body.prepend(content);
        document.body.append(popup);
        const manualPopoverOptions = {
            lightDismiss: false,
            showImmediately: false,
            position: options.position,
        };
        if (options.toggler) {
            manualPopoverOptions.toggler = options.toggler;
        }
        this.manualPopup = new ManualPopover(popup, manualPopoverOptions);
        this.area = new Area(refs.body);
        this.#body = refs.body;
        if (refs.closeButton) {
            refs.closeButton.addEventListener("click", () => {
                this.close();
            });
        }
    }
    static get defaultOptions() {
        return Object.assign({}, this.#defaultOptions);
    }
    get body() {
        return this.#body;
    }
    close() {
        if (typeof this.#options.onClose !== "function") {
            this.hide();
        } else {
            this.#options.onClose.call(this);
        }
    }
    remove() {
        this.area.close();
        this.#el.remove();
    }
    static createCarcass(title, { includeCloseButton = true, classes }) {
        const refs = {};
        const headerEls = [];
        if (title) {
            headerEls.push({
                node: createElement("h1", { text: title, classes: ["popup-title"] }),
                ref: "title"
            });
        }
        if (includeCloseButton) {
            headerEls.push({
                node: createSimpleButton("Close", ["popup-close-button"]),
                ref: "closeButton"
            });
        }
        const el = createElement("div", {
            classes,
            elems: [{
                tag: "header",
                options: {
                    classes: ["popup-header"],
                    elems: headerEls
                }
            }, {
                tag: "div",
                options: {
                    classes: ["popup-body"]
                },
                ref: "body"
            }],
        }, refs);
        return [el, refs];
    }
}