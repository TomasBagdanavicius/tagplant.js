"use strict";

import { expect } from "chai";
import { wrapSubstringsWithString } from "../../../../src/core/functions/string.js";

describe("wrapSubstringsWithString", () => {
    it("should wrap substrings with specified tags considering case and diacritic sensitivity", () => {
        const testString = "ĄČĘĖĮŠŲŪŽąčęėįšųūž ÄäÖöÜüß ÇééčćÀÉÏÓÛ Ac";
        const searchString = "Ač";
        const result = wrapSubstringsWithString(testString, searchString, "<mark>", "</mark>", true, true);
        expect(result).to.equal("<mark>ĄČ</mark>ĘĖĮŠŲŪŽ<mark>ąč</mark>ęėįšųūž ÄäÖöÜüß ÇééčćÀÉÏÓÛ <mark>Ac</mark>");
    });
});