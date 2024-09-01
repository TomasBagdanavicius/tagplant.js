"use strict";

import { expect } from "chai";
import { objectRetrieveInnerValueByStringPath } from "../../../../src/core/functions/object.js";

describe("objectRetrieveInnerValueByStringPath", () => {
    it("should retrieve the inner value by following the string path", () => {
        const o = {
            one: {
                two: {
                    three: "result",
                }
            }
        };
        const result1 = objectRetrieveInnerValueByStringPath(o, "one.two.three");
        expect(result1).to.equal("result");
        const result2 = objectRetrieveInnerValueByStringPath(o, "one.two.four");
        expect(result2).to.be.undefined;
    });
});