"use strict";

import { StringTemplate, formatCountedString } from "../functions/string.js";
import { Constraint } from "./constraint.js";

export class MinlengthConstraint extends Constraint {
    constructor(minlength) {
        super(minlength);
    }
    get description() {
        return this.constructor.descriptionTemplate.format({ minlength: this.value });
    }
    validate(value) {
        const length = value.length;
        return length >= this.value
            ? true
            : {"tooShort": this.constructor.errorMessageTemplate.format({ minlength: this.value, length })};
    }
    static get errorMessageTemplate() {
        const formatter = ({ minlength, length }) => {
            const requiredCharsText = formatCountedString(minlength, "character", "characters");
            return `Value must consist of at least ${requiredCharsText}, got ${length}.`;
        }
        return new StringTemplate({ formatter });
    }
    static get descriptionTemplate() {
        const formatter = ({ minlength }) => {
            const requiredCharsText = formatCountedString(minlength, "character", "characters");
            return `Value must consist of at least ${requiredCharsText}.`;
        }
        return new StringTemplate({ formatter });
    }
}