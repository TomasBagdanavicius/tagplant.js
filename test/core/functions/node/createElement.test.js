"use strict";

import { expect } from "chai";
import { createElement } from "../../../../src/core/functions/node.js";

describe("createElement function", () => {
    it(`should create a DIV with "Hello World!" text`, () => {
        const element = createElement("div", { text: "Hello World!" });
        expect(element.tagName).to.equal("DIV");
        expect(element.innerText).to.equal("Hello World!");
    });
});