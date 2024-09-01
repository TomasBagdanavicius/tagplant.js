"use strict";

import { expect } from "chai";
import { PagingCalculator } from "../../../../src/core/calculators/paging-calculator.js";
import { positioning } from "../../../../src/core/functions/enumeration.js";

const testCases = [
    { pageNumber: 10, pageCount: 20, size: 3, orientation: positioning.right, expectedRange: [10, 12] },
    { pageNumber: 10, pageCount: 20, size: 3, orientation: positioning.left, expectedRange: [8, 10] },
    { pageNumber: 10, pageCount: 20, size: 3, orientation: positioning.center, expectedRange: [9, 11] },
];

describe('PagingCalculator.calculateVisiblePageRange function, odd sized ranges', () => {
    testCases.forEach(({ pageNumber, pageCount, size, orientation, expectedRange }) => {
        it(`should return the correct page range for pageNumber=${pageNumber}, pageCount=${pageCount}, size=${size}`, () => {
            const range = PagingCalculator.calculateVisiblePageRange(pageNumber, pageCount, { size, orientation });
            expect(range).to.deep.equal(expectedRange);
        });
    });
});