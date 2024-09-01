"use strict";

import { expect } from "chai";
import { sortDirection } from "../../../../src/core/functions/enumeration.js";
import { getArraySorter } from "../../../../src/core/functions/array.js";

describe("getArraySorter", () => {
    it("should sort the array in descending order based on the provided sorter", () => {
        const array = ["one", "šiaudas", "two", "2", "three", "four", "five", 1, "ąžuolas"];
        const sorter = getArraySorter({ direction: sortDirection.desc });
        array.sort(sorter);
        expect(array).to.deep.equal(["two", "three", "šiaudas", "one", "four", "five", "ąžuolas", "2", 1]);
    });
    it("should sort an array of pairs in descending order based on the provided sorter", () => {
        const array = [[1, "One"], [2, "Two"], [3, "Three"]];
        const sorter = getArraySorter({ direction: sortDirection.desc, isPairs: true });
        array.sort(sorter);
        expect(array).to.deep.equal([[2, "Two"], [3, "Three"], [1, "One"]]);
    });
});