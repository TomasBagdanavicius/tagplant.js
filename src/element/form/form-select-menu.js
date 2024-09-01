"use strict";

import { CustomFormElement, customFormElementsRegistry } from "./custom-form-element.js";
import { Menu } from "../menu.js";

export class FormSelectMenu extends CustomFormElement {
    static observedAttributes = [...super.observedAttributes, "select-label"];
    static #defaultSelectLabel = "Please choose";
    #menu;
    constructor({ populateKey = true } = {}) {
        super();
        this.constraints.required.message = "Please choose a value.";
        const menu = new Menu({
            headingText: FormSelectMenu.#defaultSelectLabel,
            type: Menu.types.toggle,
            selectValue: true,
        });
        this.#menu = menu;
        menu.addEventListener("changeselectvalue", e => {
            this.value = populateKey ? e.detail.newKey : e.detail.newValue;
        });
    }
    get selectLabel() {
        return this.getAttribute("select-label") || FormSelectMenu.#defaultSelectLabel;
    }
    set selectLabel(value) {
        const valueType = typeof value;
        if (valueType !== "string") {
            throw new TypeError(`Select label must be a string, ${valueType} given`);
        }
        if (!this.value) {
            this.#menu.headingText = value;
        }
        this.setAttribute("select-label", value);
    }
    get menu() {
        return this.#menu;
    }
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        switch (name) {
            case "select-label":
                if (newValue !== oldValue) {
                    this.selectLabel = newValue;
                }
            break;
            case "id":
                this.menu.element.id = this.id;
            break;
        }
    }
    connectedCallback() {
        this.shadowRoot.appendChild(this.#menu.element);
        super.connectedCallback();
        const label = this.labelElement;
        if (label) {
            label.addEventListener("click", () => {
                this.menu.headingElement.click();
            });
        }
    }
    static get type() {
        return "select";
    }
    addOption(value, key) {
        this.#menu.appendButton(value, String(key));
    }
    removeOption(key) {
        this.#menu.remove(key);
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
        this.#menu.resetSelect();
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
customFormElementsRegistry.add("form-select-menu", FormSelectMenu);