"use strict";

import { stringTemplate } from "../functions/string.js";
import { Constraint } from "./constraint.js";

export class ContainsLetterConstraint extends Constraint {
    constructor(letter) {
        super(letter);
    }
    get description() {
        return this.constructor.descriptionTemplate.format({ letter: this.value });
    }
    validate(value) {
        return (value.includes(this.value))
            ? true
            : {"customError": this.description};
    }
    static get errorMessageTemplate() {
        return stringTemplate`Value must contain at least one letter "${"letter"}".`;
    }
    static get descriptionTemplate() {
        return ContainsLetterConstraint.errorMessageTemplate;
    }
}