"use strict";

import { expect } from "chai";
import { PagingCalculator } from "../../../../src/core/calculators/paging-calculator.js";
import { positioning } from "../../../../src/core/functions/enumeration.js";

const testCases = [
    { pageNumber: 1, pageCount: 5, size: 10, orientation: positioning.right, expectedRange: [1, 5] },
    { pageNumber: 1, pageCount: 5, size: 10, orientation: positioning.left, expectedRange: [1, 5] },
    { pageNumber: 1, pageCount: 5, size: 10, orientation: positioning.center, expectedRange: [1, 5] },
];

describe('PagingCalculator.calculateVisiblePageRange function, size larger than page count', () => {
    testCases.forEach(({ pageNumber, pageCount, size, orientation, expectedRange }) => {
        it(`should return the correct page range for pageNumber=${pageNumber}, pageCount=${pageCount}, size=${size}`, () => {
            const range = PagingCalculator.calculateVisiblePageRange(pageNumber, pageCount, { size, orientation });
            expect(range).to.deep.equal(expectedRange);
        });
    });
});