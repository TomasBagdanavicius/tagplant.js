"use strict";

import { expect } from "chai";
import { PagingCalculator } from "../../../../src/core/calculators/paging-calculator.js";
import { positioning } from "../../../../src/core/functions/enumeration.js";

const testCases = [
    { pageNumber: 10, pageCount: 50, size: 5, orientation: positioning.right, expectedRange: [10, 14] },
    { pageNumber: 25, pageCount: 50, size: 5, orientation: positioning.left, expectedRange: [21, 25] },
    { pageNumber: 25, pageCount: 50, size: 5, orientation: positioning.right, expectedRange: [25, 29] },
];

describe('PagingCalculator.calculateVisiblePageRange function, larger page count', () => {
    testCases.forEach(({ pageNumber, pageCount, size, orientation, expectedRange }) => {
        it(`should return the correct page range for pageNumber=${pageNumber}, pageCount=${pageCount}, size=${size}`, () => {
            const range = PagingCalculator.calculateVisiblePageRange(pageNumber, pageCount, { size, orientation });
            expect(range).to.deep.equal(expectedRange);
        });
    });
});