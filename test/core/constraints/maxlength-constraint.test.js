"use strict";

import { expect } from "chai";
import { MaxlengthConstraint } from "../../../src/core/constraints/maxlength-constraint.js";
import { StringTemplate } from "../../../src/core/functions/string.js";

let maxlengthConstraint;

before(() => {
    maxlengthConstraint = new MaxlengthConstraint(3);
});

describe("MaxlengthConstraint", () => {
    it("should return true for value within the maximum length", () => {
        expect(maxlengthConstraint.validate("Hi")).to.be.true;
    });
    it("should return custom error for value exceeding the maximum length", () => {
        expect(maxlengthConstraint.validate("abcd")).to.deep.equal({ tooLong: 'Value must not consist of more than 3 characters, got 4.' });
    });
    it("should have the correct description", () => {
        expect(maxlengthConstraint.description).to.equal('Value must not consist of more than 3 characters.');
    });
    it("should have descriptionTemplate as an instance of StringTemplate", () => {
        expect(MaxlengthConstraint.descriptionTemplate).to.be.instanceOf(StringTemplate);
    });
});