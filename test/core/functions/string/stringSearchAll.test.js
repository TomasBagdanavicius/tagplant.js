"use strict";

import { expect } from "chai";
import { stringSearchAll } from "../../../../src/core/functions/string.js";

describe("stringSearchAll function", () => {
    it(`should return correct indices of all occurrences of substring "or" in the given string`, () => {
        const result = stringSearchAll("Lorem ipsum dolor sit amet", "or");
        expect(result).to.deep.equal([1, 15]);
    });
    it("should return the correct indices of all occurrences of the search string with case sensitivity", () => {
        const result = stringSearchAll("Lorem ipsum, lorem ipsum", "lo");
        expect(result).to.deep.equal([13]);
    });
    it("should return the correct indices of all occurrences of the search string without case sensitivity", () => {
        const result = stringSearchAll("Lorem ipsum, lorem ipsum", "lo", true);
        expect(result).to.deep.equal([0, 13]);
    });
    it("should return an empty array when no occurrences are found with case sensitivity and no diacritic sensitivity", () => {
        const result = stringSearchAll("Ąžuolas", "az", true, false);
        expect(result).to.deep.equal([]);
    });
    it("should return the correct indices of all occurrences without case sensitivity and diacritic sensitivity", () => {
        const result = stringSearchAll("Ąžuolas", "az", true, true);
        expect(result).to.deep.equal([0]);
    });
});