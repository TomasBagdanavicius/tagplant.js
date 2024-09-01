"use strict";

import { expect } from "chai";
import { determineConfigByMap } from "../../../../src/core/functions/object.js";

describe("determineConfigByMap", () => {
    it("should return the correct value based on the map and data", () => {
        const data = {
            one: {
                two: {
                    three: "drei",
                }
            },
            two: "zwei",
            three: "drei (Level 1)",
        };
        let config = determineConfigByMap({
            "drei": "one.two.three",
        }, data);
        expect(config).to.deep.equal({ drei: "drei" });
    });
    it("should return an empty object when validProps exclude the mapped path", () => {
        const data = {
            one: {
                two: {
                    three: "drei",
                }
            },
            two: "zwei",
            three: "drei (Level 1)",
        };
        let config = determineConfigByMap({
            "drei": "one.two.three",
        }, data, { validProps: ["three"] });
        expect(config).to.deep.equal({});
    });
    it("should return the correct value when considerArrayAsMultiPath is true", () => {
        const data = {
            one: {
                two: {
                    three: "drei",
                }
            },
            two: "zwei",
            three: "drei (Level 1)",
        };
        let config = determineConfigByMap({
            "drei": ["three", "one.two.three"],
        }, data, { considerArrayAsMultiPath: true });
        expect(config).to.deep.equal({ drei: "drei (Level 1)" });
    });
});