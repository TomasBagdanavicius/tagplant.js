"use strict";

export class Constraint extends EventTarget {
    #value;
    constructor(value) {
        super();
        this.#value = value;
    }
    set value(newValue) {
        if (newValue !== this.#value) {
            const oldValue = this.#value;
            this.#value = newValue;
            this.dispatchEvent(new CustomEvent("valuechange", {
                detail: { newValue, oldValue }
            }));
        }
    }
    get value() {
        return this.#value;
    }
}

export function massValidate(setOfConstraints, value) {
    const result = {};
    for (const constraint of setOfConstraints) {
        const validationResult = constraint.validate(value);
        if (validationResult !== true) {
            result[constraint.constructor.name] = validationResult;
        }
    }
    return result;
}