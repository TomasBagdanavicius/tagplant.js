"use strict";

import { stringTemplate } from "../functions/string.js";
import { Constraint } from "./constraint.js";

export class MatchValueConstraint extends Constraint {
    #currentElement;
    constructor(element) {
        super(element);
        this.#currentElement = this.element;
        this.addEventListener("valuechange", () => {
            this.dispatchEvent(new CustomEvent("associatedformelementschange", {
                detail: {
                    removedElements: [this.#currentElement],
                    addedElements: [this.element]
                }
            }));
            this.#currentElement = this.element;
        });
    }
    get description() {
        return this.constructor.descriptionTemplate.format({ elementId: this.elementId });
    }
    get element() {
        if (this.value instanceof Element) {
            return this.value;
        } else {
            return document.getElementById(this.value);
        }
    }
    get elementId() {
        return this.element.id || "associated-element";
    }
    get associatedFormElements() {
        return [this.element];
    }
    validate(value) {
        const element = this.element;
        return !element.value || value == element.value
            ? true
            : {"customError": this.description};
    }
    static get errorMessageTemplate() {
        return stringTemplate`Value must match the one provided in #${"elementId"}.`;
    }
    static get descriptionTemplate() {
        return MatchValueConstraint.errorMessageTemplate;
    }
    static get defaultFormElementAttrName() {
        return "matchvalue";
    }
}