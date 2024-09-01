"use strict";

import { expect } from "chai";
import { ContainsLetterConstraint } from "../../../src/core/constraints/contains-letter-constraint.js";
import { StringTemplate } from "../../../src/core/functions/string.js";

let constraint;
before(() => {
    constraint = new ContainsLetterConstraint("a");
});

describe("ContainsLetterConstraint", () => {
    it("should return custom error for value without the letter 'a'", () => {
        expect(constraint.validate("Hello World!")).to.deep.equal({ customError: 'Value must contain at least one letter "a".' });
    });
    it("should return true for value containing the letter 'a'", () => {
        expect(constraint.validate("abc")).to.be.true;
    });
    it("should have the correct description", () => {
        expect(constraint.description).to.equal('Value must contain at least one letter "a".');
    });
    it("should have descriptionTemplate as an instance of StringTemplate", () => {
        expect(ContainsLetterConstraint.descriptionTemplate).to.be.instanceOf(StringTemplate);
    });
});