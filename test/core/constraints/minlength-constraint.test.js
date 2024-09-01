"use strict";

import { expect } from "chai";
import { MinlengthConstraint } from "../../../src/core/constraints/minlength-constraint.js";
import { StringTemplate } from "../../../src/core/functions/string.js";

let minlengthConstraint;

before(() => {
    minlengthConstraint = new MinlengthConstraint(3);
});

describe("MinlengthConstraint", () => {
    it("should return custom error for value shorter than minimum length", () => {
        expect(minlengthConstraint.validate("Hi")).to.deep.equal({ tooShort: 'Value must consist of at least 3 characters, got 2.' });
    });
    it("should return true for value meeting the minimum length requirement", () => {
        expect(minlengthConstraint.validate("abc")).to.be.true;
    });
    it("should have the correct description", () => {
        expect(minlengthConstraint.description).to.equal('Value must consist of at least 3 characters.');
    });
    it("should have descriptionTemplate as an instance of StringTemplate", () => {
        expect(MinlengthConstraint.descriptionTemplate).to.be.instanceOf(StringTemplate);
    });
});