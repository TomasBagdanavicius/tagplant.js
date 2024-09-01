"use strict";

import { expect } from "chai";
import { MatchValueConstraint } from "../../../src/core/constraints/match-value-constraint.js";
import { StringTemplate } from "../../../src/core/functions/string.js";
import { createElement } from "../../../src/core/functions/node.js";

let matchValueConstraint;
before(() => {
    const input = createElement("input", {
        attrs: {
            name: "foo",
            value: "Lorem",
            id: "input1",
        }
    });
    document.body.append(input);
    matchValueConstraint = new MatchValueConstraint("input1");
});

describe("MatchValueConstraint", () => {
    it("should return custom error if value does not match the input value", () => {
        expect(matchValueConstraint.validate("Ipsum")).to.deep.equal({ customError: "Value must match the one provided in #input1." });
    });
    it("should return true if value matches the input value", () => {
        expect(matchValueConstraint.validate("Lorem")).to.be.true;
    });
    it("should have the correct description", () => {
        expect(matchValueConstraint.description).to.equal("Value must match the one provided in #input1.");
    });
    it("should have descriptionTemplate as an instance of StringTemplate", () => {
        expect(MatchValueConstraint.descriptionTemplate).to.be.instanceOf(StringTemplate);
    });
});