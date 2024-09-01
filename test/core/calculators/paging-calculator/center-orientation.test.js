"use strict";

import { expect } from "chai";
import { PagingCalculator } from "../../../../src/core/calculators/paging-calculator.js";
import { positioning } from "../../../../src/core/functions/enumeration.js";

const testCases = [
    { pageNumber: 5, pageCount: 15, size: 5, orientation: positioning.center, expectedRange: [3, 7] },
    { pageNumber: 10, pageCount: 15, size: 5, orientation: positioning.center, expectedRange: [8, 12] },
    { pageNumber: 15, pageCount: 15, size: 5, orientation: positioning.center, expectedRange: [11, 15] },
    { pageNumber: 1, pageCount: 15, size: 5, orientation: positioning.center, expectedRange: [1, 5] },
    { pageNumber: 5, pageCount: 15, size: 4, orientation: positioning.center, expectedRange: [4, 7] },
    { pageNumber: 2, pageCount: 15, size: 5, orientation: positioning.center, expectedRange: [1, 5] },
];

describe('PagingCalculator.calculateVisiblePageRange function, center orientation', () => {
    testCases.forEach(({ pageNumber, pageCount, size, orientation, expectedRange }) => {
        it(`should return the correct page range for pageNumber=${pageNumber}, pageCount=${pageCount}, size=${size}`, () => {
            const range = PagingCalculator.calculateVisiblePageRange(pageNumber, pageCount, { size, orientation });
            expect(range).to.deep.equal(expectedRange);
        });
    });
});