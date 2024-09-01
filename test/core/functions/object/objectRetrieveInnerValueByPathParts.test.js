"use strict";

import { expect } from "chai";
import { objectRetrieveInnerValueByPathParts } from "../../../../src/core/functions/object.js";

describe("objectRetrieveInnerValueByPathParts", () => {
    it("should retrieve the inner value by following the path parts", () => {
        const o = {
            "foo.bar": {
                two: {
                    three: "result",
                }
            }
        };
        const result1 = objectRetrieveInnerValueByPathParts(o, ["foo.bar", "two", "three"]);
        expect(result1).to.equal("result");
        const result2 = objectRetrieveInnerValueByPathParts(o, ["foo.bar", "two", "four"]);
        expect(result2).to.be.undefined;
    });
});