"use strict";

import { StringTemplate, formatCountedString } from "../functions/string.js";
import { Constraint } from "./constraint.js";

export class MaxlengthConstraint extends Constraint {
    constructor(maxlength) {
        super(maxlength);
    }
    get description() {
        return this.constructor.descriptionTemplate.format({ maxlength: this.value });
    }
    validate(value) {
        const length = value.length;
        return length <= this.value
            ? true
            : {"tooLong": this.constructor.errorMessageTemplate.format({ maxlength: this.value, length })};
    }
    static get errorMessageTemplate() {
        const formatter = ({ maxlength, length }) => {
            const requiredCharsText = formatCountedString(maxlength, "character", "characters");
            return `Value must not consist of more than ${requiredCharsText}, got ${length}.`;
        }
        return new StringTemplate({ formatter });
    }
    static get descriptionTemplate() {
        const formatter = ({ maxlength }) => {
            const requiredCharsText = formatCountedString(maxlength, "character", "characters");
            return `Value must not consist of more than ${requiredCharsText}.`;
        }
        return new StringTemplate({ formatter });
    }
}