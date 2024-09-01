"use strict";

import { expect } from "chai";
import { formatCountedString, stringTemplate } from "../../../../src/core/functions/string.js";

describe("formatCountedString", () => {
    it("should format singular count correctly", () => {
        const result = formatCountedString(1, "character", "characters");
        expect(result).to.equal("1 character");
    });
    it("should format plural count correctly", () => {
        const result = formatCountedString(2, "character", "characters");
        expect(result).to.equal("2 characters");
    });
    it("should format using custom string template correctly", () => {
        const customTemplate = stringTemplate`${"text"} ${"count"}`;
        const result = formatCountedString(1, "character", "characters", customTemplate);
        expect(result).to.equal("character 1");
    });
});