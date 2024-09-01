"use strict";

import { expect } from "chai";
import { positionalCorners } from "../../../src/core/functions/enumeration.js";
import { Point2D } from "../../../src/core/geometry/point-2d.js";

describe("Point2D", () => {
    it("should shift by top right positional corner correctly", () => {
        const point = new Point2D(100, 100);
        const shifted = point.shiftByPositionalCorner(positionalCorners.topright, 50, 75);
        expect(shifted.x).to.equal(50);
        expect(shifted.y).to.equal(100);
    });
    it("should shift by bottom right positional corner correctly", () => {
        const point = new Point2D(100, 100);
        const shifted = point.shiftByPositionalCorner(positionalCorners.bottomright, 50, 75);
        expect(shifted.x).to.equal(50);
        expect(shifted.y).to.equal(25);
    });
    it("should shift by top left positional corner correctly", () => {
        const point = new Point2D(100, 100);
        const shifted = point.shiftByPositionalCorner(positionalCorners.topleft, 50, 75);
        expect(shifted.x).to.equal(100);
        expect(shifted.y).to.equal(100);
    });
});