"use strict";

import { expect } from "chai";
import { compareTwoObjects } from "../../../../src/core/functions/object.js";

describe("compareTwoObjects", () => {
    it("should return true for objects with identical keys and values, regardless of order", () => {
        const obj1 = {
            one: "One",
            two: "Two",
        };
        const obj2 = {
            two: "Two",
            one: "One",
        };
        const result = compareTwoObjects(obj1, obj2);
        expect(result).to.be.true;
    });
    it("should return false for objects with different keys or values", function() {
        const obj1 = {
            one: "One",
            two: "Two",
        };
        const obj2 = {
            one: "One",
            two: "Three",
        };
        const result = compareTwoObjects(obj1, obj2);
        expect(result).to.be.false;
    });
});