"use strict";

import { positionalCorners, validateEnumMember } from "../functions/enumeration.js";

export class Point2D {
    #x;
    #y;
    constructor(x, y) {
        this.#x = x;
        this.#y = y;
    }
    get x() {
        return this.#x;
    }
    get y() {
        return this.#y;
    }
    shift(x, y) {
        return new Point2D(this.#x + x, this.#y + y);
    }
    shiftX(x) {
        return new Point2D(this.#x + x, this.#y);
    }
    shiftY(y) {
        return new Point2D(this.#x, this.#y + y);
    }
    shiftByPositionalCorner(corner, x, y) {
        validateEnumMember(corner, "positionalCorners");
        switch(corner) {
            case positionalCorners.topright:
                return this.shiftX(-x);
            case positionalCorners.bottomleft:
                return this.shiftY(-y);
            case positionalCorners.bottomright:
                return this.shift(-x, -y);
            // Top-left is the default value
            default:
                return this;
        }
    }
    toDOMPoint(readonly = false) {
        if (!readonly) {
            return new DOMPoint(this.#x, this.#y);
        } else {
            return new DOMPointReadOnly(this.#x, this.#y);
        }
    }
}