"use strict";

import { createElement, createSimpleButton } from "../../core/functions/node.js";
import { isNullish, validateVarInterface } from "../../core/functions/misc.js";
import { adjacencyPositions } from "../../core/functions/enumeration.js";
import { FormElementWithInternalFE, customFormElementsRegistry } from "./custom-form-element.js";
import { Process } from "../../process/process.js";
import { userPaths } from "../../../var/paths.js";

export class CheckBoxElement extends FormElementWithInternalFE {
    static observedAttributes = [...super.observedAttributes, "checked"];
    static #defaultValue = "on";
    static isValueLocked = true;
    #stateTextEl;
    constructor() {
        super();
        this.constraints.required.message = "Please select this checkbox.";
    }
    createInternalFormElement() {
        const internalFormElement = createSimpleButton("Toggle", ["toggle"]);
        internalFormElement.addEventListener("click", () => this.toggle());
        internalFormElement.id = this.id;
        return internalFormElement;
    }
    connectedCallback() {
        if (this.hasAttribute("disabled")) {
            this.internalFormElement.disabled = true;
        }
        if (!this.wasConnected) {
            this.shadowRoot.appendChild(this.internalFormElement);
            this.#stateTextEl = createElement("span", {
                classes: ["state-text"],
                text: this.stateText,
            });
            this.shadowRoot.appendChild(this.#stateTextEl);
            this.internals.role = "checkbox";
            this.internals.ariaChecked = this.checked;
        }
        super.connectedCallback();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        switch (name) {
            case "checked":
                this.setValue(this.value, this.state);
                if (this.checked) {
                    this.internals.states.add("checked");
                } else {
                    this.internals.states.delete("checked");
                }
                break;
            case "disabled":
                if (oldValue === null) {
                    this.internalFormElement.disabled = true;
                } else if (newValue === null) {
                    this.internalFormElement.disabled = false;
                }
        }
    }
    get type() {
        return this.localName;
    }
    static get type() {
        return "checkbox";
    }
    get checked() {
        return this.hasAttribute("checked");
    }
    get state() {
        return this.checked ? "checked" : "unchecked";
    }
    get stateText() {
        if (this.undetermined) {
            return "Undetermined";
        } else {
            return this.checked ? "Checked" : "Unchecked";
        }
    }
    set value(value) {
        if (this.getAttribute("value") !== value) {
            this.setAttribute("value", value);
        }
    }
    get value() {
        if (!this.checked) {
            return null;
        }
        if (this.hasAttribute("value")) {
            return this.getAttribute("value");
        } else {
            return CheckBoxElement.#defaultValue;
        }
    }
    static get defaultValue() {
        return this.#defaultValue;
    }
    set checked(flag) {
        const currentState = this.checked;
        const newState = Boolean(flag);
        if (currentState !== newState) {
            this.toggleAttribute("checked", newState);
            this.dispatchEvent(new CustomEvent("change", {
                detail: { newState, value: this.value }
            }));
            this.updateStateText();
        }
    }
    set disabled(flag) {
        if (flag) {
            this.setAttribute("disabled", "disabled");
        } else {
            this.removeAttribute("disabled");
            this.undetermined = false;
        }
    }
    set undetermined(flag) {
        if (flag) {
            this.setAttribute("undetermined", "undetermined");
            this.disabled = true;
        } else {
            this.removeAttribute("undetermined");
            this.updateStateText();
        }
    }
    get undetermined() {
        return this.hasAttribute("undetermined");
    }
    get button() {
        return this.internalFormElement;
    }
    get elementId() {
        return "checkbox";
    }
    check() {
        this.checked = true;
    }
    uncheck() {
        this.checked = false;
    }
    clear() {
        this.uncheck();
    }
    toggle() {
        this.checked = !this.checked;
    }
    getBaseValidityFlags() {
        const flags = this.constructor.buildValidityFlagsTemplate();
        if (this.hasInternalConstraintEnabled("required") && !this.checked) {
            flags.valueMissing = true;
        }
        return flags;
    }
    updateStateText() {
        if (this.#stateTextEl) {
            this.#stateTextEl.textContent = this.stateText;
        }
    }
    getControlsConfig() {
        return { ...super.getControlsConfig(), ...{
            toggle: {
                text: "Toggle",
                // Always active
                active: true,
                obtainButton: button => {
                    button.addEventListener("click", () => {
                        this.toggle();
                    });
                    return button;
                }
            }
        }};
    }
    attachErrorList(list) {
        const elementAfter = this.descriptionElement || this.internalFormElement;
        list.attach(elementAfter, { adjacency: adjacencyPositions.afterend });
    }
    attachProcess(process) {
        validateVarInterface(process, Process);
        if (!process.isEnded) {
            const attach = () => {
                this.undetermined = true;
                process.attachedClassToggling(this.internalFormElement, {
                    class: "process-running"
                });
            }
            if (process.isRunning) {
                attach();
            }
            process.addEventListener("statuschange", e => {
                const { newStatus } = e.detail;
                if (newStatus === process.statuses.running) {
                    attach();
                } else {
                    this.disabled = false;
                }
            });
        }
    }
    static createElement(name, { tag = "check-box", checked = false, stylesheet, controlsmenu = "none", required = false, value, label } = {}) {
        if (!stylesheet && userPaths?.stylesheets?.checkbox) {
            stylesheet = userPaths.stylesheets.checkbox;
        }
        const elem = document.createElement(tag);
        elem.setAttribute("name", name);
        if (checked) {
            elem.setAttribute("checked", "checked");
        }
        if (stylesheet) {
            elem.setAttribute("stylesheet", stylesheet);
        }
        elem.setAttribute("controlsmenu", controlsmenu);
        if (required) {
            elem.setAttribute("required", "required");
        }
        if (!isNullish(value)) {
            elem.setAttribute("value", value);
        }
        if (label) {
            elem.setAttribute("label", label);
        }
        return elem;
    }
}

customFormElementsRegistry.add("check-box", CheckBoxElement);