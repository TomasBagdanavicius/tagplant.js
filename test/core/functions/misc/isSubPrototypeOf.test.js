"use strict";

import { expect } from "chai";
import { isSubPrototypeOf } from "../../../../src/core/functions/misc.js";

describe("isSubPrototypeOf", function() {
    it("should return true if a class prototype is a subclass of another class prototype", () => {
        class Base {}
        class Test extends Base {
            constructor() {
                super();
            }
        }
        const classVariable = Test;
        const result = isSubPrototypeOf(classVariable.prototype, Base.prototype);
        expect(result).to.be.true;
    });
    it("should return false if a class prototype is not a subclass of another class prototype", () => {
        class Base {}
        class Base2 {}
        class Test extends Base {
            constructor() {
                super();
            }
        }
        const classVariable = Test;
        const result = isSubPrototypeOf(classVariable.prototype, Base2.prototype);
        expect(result).to.be.false;
    });
});