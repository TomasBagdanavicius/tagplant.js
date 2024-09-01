"use strict";

import { expect } from "chai";
import { PagingCalculator } from "../../../../src/core/calculators/paging-calculator.js";
import { positioning } from "../../../../src/core/functions/enumeration.js";

const testCases = [
    { pageNumber: 10, pageCount: 15, size: 10, orientation: positioning.right, expectedRange: [6, 15] },
    { pageNumber: 10, pageCount: 15, size: 10, orientation: positioning.left, expectedRange: [1, 10] },
    { pageNumber: 10, pageCount: 15, size: 10, orientation: positioning.center, expectedRange: [6, 15] },
];

describe('PagingCalculator.calculateVisiblePageRange function, large size', () => {
    testCases.forEach(({ pageNumber, pageCount, size, orientation, expectedRange }) => {
        it(`should return the correct page range for pageNumber=${pageNumber}, pageCount=${pageCount}, size=${size}`, () => {
            const range = PagingCalculator.calculateVisiblePageRange(pageNumber, pageCount, { size, orientation });
            expect(range).to.deep.equal(expectedRange);
        });
    });
});