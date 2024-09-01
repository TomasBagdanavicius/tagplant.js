"use strict";

import { expect } from "chai";
import { isNullish } from "../../../../src/core/functions/misc.js";

describe("isNullish function", () => {
    it("should return true", () => {
        expect(isNullish(undefined)).to.be.true;
    });
    it("should return true", () => {
        expect(isNullish(null)).to.be.true;
    });
    it("should return false", () => {
        expect(isNullish("foo")).to.be.false;
    });
});