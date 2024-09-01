"use strict";

import { createSimpleButton } from "../../core/functions/node.js";
import { stringGetInnerText } from "../../core/functions/string.js";
import { validateURL } from "../../core/functions/misc.js";
import { createAndDefineCustomElement, createSlottedTemplate } from "../../core/web-component/functions.js";
import { Group } from "../group.js";
import { CustomFormElement, FormElementWithInternalFE, customFormElementsRegistry } from "./custom-form-element.js";
import { Popup } from "../../components/popover.js";
import { Process } from "../../process/process.js";
import { adjacencyPositions } from "../../core/functions/enumeration.js";

export class ReferenceSelect extends FormElementWithInternalFE {
    static observedAttributes = [...super.observedAttributes, "select-label", "url", "module-title"];
    static #defaultSelectLabel = "Please choose";
    constructor() {
        super();
        this.constraints.required.message = "Please choose a value.";
    }
    createInternalFormElement() {
        const internalFormElement = createSimpleButton(this.selectLabel, ["select"]);
        const template = createSlottedTemplate(["title"]);
        const customElementName = "reference-select-item";
        createAndDefineCustomElement(customElementName, { template, throwOnDuplicate: false });
        internalFormElement.addEventListener("click", async () => {
            const url = new URL(this.url);
            const importPromise = import("../listing/api-listing.js");
            const process = Process.wrapAroundPromise(importPromise, ["import-api-listing", "Import API Listing"]);
            process.delayedInfoToggler(internalFormElement, { adjacency: adjacencyPositions.afterbegin });
            const { ApiListing } = await importPromise;
            let popup;
            const groupMemberBuilder = Group.customElementMemberBuilder;
            groupMemberBuilder.customElementName = customElementName;
            const listing = new ApiListing(this.moduleTitle, url, {
                classes: ["listing-reference-select"],
                groupMemberBuilder,
                itemBindings: ({ item, key, element }) => {
                    item.classList.add("clickable");
                    item.addEventListener("click", () => {
                        this.value = String(key);
                        this.#setButtonText(stringGetInnerText(element.title));
                        popup.close();
                    });
                }
            });
            popup = new Popup(listing.element, {
                title: this.moduleTitle,
                onClose: () => {
                    popup.remove();
                }
            });
            popup.show();
        });
        internalFormElement.id = this.id;
        return internalFormElement;
    }
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        switch (name) {
            case "select-label":
                if (newValue !== oldValue) {
                    this.selectLabel = newValue;
                }
            break;
            case "url":
                if (newValue !== oldValue) {
                    this.url = newValue;
                }
            break;
            case "module-title":
                if (newValue !== oldValue) {
                    this.moduleTitle = newValue;
                }
            break;
        }
    }
    connectedCallback() {
        if (!this.url) {
            throw new Error("URL is not defined");
        }
        this.shadowRoot.appendChild(this.internalFormElement);
        super.connectedCallback();
    }
    static get type() {
        return "reference-select";
    }
    set selectLabel(value) {
        const valueType = typeof value;
        if (valueType !== "string") {
            throw new TypeError(`Select label must be a string, ${valueType} given`);
        }
        if (!this.value) {
            this.#setButtonText(value);
        }
        this.setAttribute("select-label", value);
    }
    get selectLabel() {
        return this.getAttribute("select-label") || ReferenceSelect.#defaultSelectLabel;
    }
    set url(value) {
        validateURL(value);
        this.setAttribute("url", value);
    }
    get url() {
        return this.getAttribute("url");
    }
    set moduleTitle(value) {
        const valueType = typeof value;
        if (valueType !== "string") {
            throw new TypeError(`Module title must be a string, ${valueType} given`);
        }
        this.setAttribute("module-title", value);
    }
    get moduleTitle() {
        return this.getAttribute("module-title");
    }
    #setButtonText(text) {
        this.internalFormElement.innerText = text;
    }
    getBaseValidityFlags() {
        const flags = this.constructor.buildValidityFlagsTemplate();
        if (this.hasInternalConstraintEnabled("required") && !this.value) {
            flags.valueMissing = true;
        }
        return flags;
    }
    clear() {
        this.value = null;
        this.internalFormElement.innerText = this.selectLabel;
    }
    getControlsConfig() {
        return { ...super.getControlsConfig(), ...{
            clear: {
                text: "Clear",
                active: !!this.value,
                obtainButton: button => {
                    button.addEventListener("click", () => {
                        this.clear();
                    });
                    return button;
                },
                init: (onStatusChange, config) => {
                    this.addEventListener("input", e => {
                        CustomFormElement.hasValueStatusChange(e.target, config, onStatusChange);
                    });
                }
            }
        }};
    }
}

customFormElementsRegistry.add("reference-select", ReferenceSelect);