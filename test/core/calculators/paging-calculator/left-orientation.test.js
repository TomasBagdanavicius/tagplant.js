"use strict";

import { expect } from "chai";
import { PagingCalculator } from "../../../../src/core/calculators/paging-calculator.js";
import { positioning } from "../../../../src/core/functions/enumeration.js";

const testCases = [
    { pageNumber: 5, pageCount: 15, size: 5, orientation: positioning.left, expectedRange: [1, 5] },
    { pageNumber: 1, pageCount: 15, size: 5, orientation: positioning.left, expectedRange: [1, 5] },
    { pageNumber: 10, pageCount: 15, size: 5, orientation: positioning.left, expectedRange: [6, 10] },
    { pageNumber: 15, pageCount: 15, size: 5, orientation: positioning.left, expectedRange: [11, 15] },
    { pageNumber: 14, pageCount: 15, size: 5, orientation: positioning.left, expectedRange: [10, 14] },
];

describe('PagingCalculator.calculateVisiblePageRange function, left side orientation', () => {
    testCases.forEach(({ pageNumber, pageCount, size, orientation, expectedRange }) => {
        it(`should return the correct page range for pageNumber=${pageNumber}, pageCount=${pageCount}, size=${size}`, () => {
            const range = PagingCalculator.calculateVisiblePageRange(pageNumber, pageCount, { size, orientation });
            expect(range).to.deep.equal(expectedRange);
        });
    });
});