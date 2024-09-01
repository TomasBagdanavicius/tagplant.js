"use strict";

import { expect } from "chai";
import { trimSentence } from "../../../../src/core/functions/string.js";

describe("trimSentence", () => {
    it("should correctly trim a sentence to the specified length and add ellipsis", () => {
        const sentence = "He tried to behave, but alas and lack, he ended up back in prison.";
        const result = trimSentence(sentence, 5);
        expect(result).to.equal("He tried to behave, but...");
    });
});