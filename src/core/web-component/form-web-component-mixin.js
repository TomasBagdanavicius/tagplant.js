"use strict";

import { isNullish } from "../functions/misc.js";

export const FormWebComponentMixin = ({
    ElInterface = HTMLElement,
    internalsParamName = "_internals",
    stopInnerInputPropagation = true
} = {}) => {
    return class extends ElInterface {
        static formAssociated = true;
        static validityFlags = [
            "valueMissing",
            "typeMismatch",
            "patternMismatch",
            "tooLong",
            "tooShort",
            "rangeUnderflow",
            "rangeOverflow",
            "stepMismatch",
            "badInput",
            "customError",
        ];
        static observedAttributes = [...super.observedAttributes, "value"];
        #value = "";
        #valueState;
        // For when "valuechange" event is too slow.
        #valueChangeCallbacks = [];
        constructor() {
            super();
            this.internalsParamName = internalsParamName;
            this[this.internalsParamName] = this.attachInternals();
            /* Quite often custom form elements will host other form elements inside, which will bubble up the "input" event through to the custom element. */
            if (stopInnerInputPropagation) {
                this.addEventListener("input", e => {
                    const composedPath = e.composedPath();
                    // Input event is bubbling through from an inner element.
                    if (composedPath[0] !== this) {
                        e.stopImmediatePropagation();
                    }
                });
            }
        }
        get internals() {
            return this[this.internalsParamName];
        }
        get form() {
            return this.internals.form;
        }
        get name() {
            return this.getAttribute("name");
        }
        get valid() {
            return this.internals.checkValidity();
        }
        setValue(value, { state, inputType = "", inputData, dispatchInputEvent = true, dispatchValueChangeEvent = true } = {}) {
            if (typeof value !== "string" && !isNullish(value)) {
                throw new TypeError("Custom form element value must be either a string or nullish");
            }
            if (value === undefined) {
                value = null;
            }
            if (value !== this.#value || state !== this.#valueState) {
                const oldValue = this.#value;
                this.internals.setFormValue(value, state);
                this.#value = value;
                this.#valueState = state;
                if (!isNullish(value)) {
                    this.setAttribute("value", value);
                } else if (!this.constructor.isValueAssistive) {
                    this.removeAttribute("value");
                }
                if (dispatchValueChangeEvent) {
                    this.#sendValueChangeCallbacks(value, oldValue);
                    this.dispatchEvent(new CustomEvent("valuechange", {
                        detail: { newValue: value, oldValue }
                    }));
                }
                if (dispatchInputEvent) {
                    this.dispatchInputEvent({ type: inputType, data: inputData });
                }
            }
        }
        set value(value) {
            this.setValue(value);
        }
        getValue() {
            return this.#value;
        }
        get value() {
            return this.getValue();
        }
        get valueState() {
            return this.#valueState;
        }
        getInputEvent({ type = "", data } = {}) {
            return new InputEvent("input", {
                bubbles: true,
                cancelable: false,
                inputType: type,
                data,
            });
        }
        dispatchInputEvent({ type = "", data } = {}) {
            this.dispatchEvent(this.getInputEvent({ type, data }));
        }
        addValueChangeCallback(callback) {
            if (typeof callback !== "function") {
                throw new TypeError("Callback must be a function");
            }
            this.#valueChangeCallbacks.push(callback);
        }
        #sendValueChangeCallbacks(newValue, oldValue) {
            for (const callback of this.#valueChangeCallbacks) {
                callback({ newValue, oldValue });
            }
        }
        attributeChangedCallback(name, oldValue, newValue) {
            super.attributeChangedCallback(name, oldValue, newValue);
            switch (name) {
                case "value":
                    if (newValue !== oldValue && !this.constructor.isValueAssistive) {
                        this.setValue(newValue);
                    }
            }
        }
        connectedCallback(template) {
            super.connectedCallback(template);
            // If I add this into the constructor, I get a "The result must not have attributes" error.
            this.classList.add("form-custom-element");
        }
        getValidityFlagIndex(flag) {
            const index = this.constructor.validityFlags.indexOf(flag);
            return index !== -1 ? index : null;
        }
        static buildValidityFlagsTemplate() {
            const flags = {};
            for (const flag of this.validityFlags) {
                flags[flag] = false;
            }
            return flags;
        }
    }
}