"use strict";

import { expect } from "chai";
import { MinlengthConstraint } from "../../../src/core/constraints/minlength-constraint.js";
import { ContainsLetterConstraint } from "../../../src/core/constraints/contains-letter-constraint.js";
import { massValidate } from "../../../src/core/constraints/constraint.js";

let minlengthConstraint;
let containsLetterConstraint;
before(() => {
    minlengthConstraint = new MinlengthConstraint(3);
    containsLetterConstraint = new ContainsLetterConstraint("a");
});

describe("Constraint", () => {
    it("should return errors for all constraints if value fails", () => {
        const set = new Set([minlengthConstraint, containsLetterConstraint]);
        const result = massValidate(set, "Hi");
        expect(result).to.deep.equal({
            ContainsLetterConstraint: { customError: 'Value must contain at least one letter "a".' },
            MinlengthConstraint: { tooShort: 'Value must consist of at least 3 characters, got 2.' }
        });
    });
});