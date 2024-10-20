"use strict";

import { expect } from "chai";
import { createElement } from "../../../../src/core/functions/node.js";

describe("`createElement` function", () => {
    it(`should create a DIV with "Hello World!" text`, () => {
        const element = createElement("div", { text: "Hello World!" });
        expect(element.localName).to.equal("div");
        expect(element.tagName).to.equal("DIV");
        expect(element.innerText).to.equal("Hello World!");
    });
    it(`should create a SPAN with "Hello World!" text and custom class name`, () => {
        const element = createElement("span", { text: "Hello World!", classes: ['hello-world'] });
        expect(element.localName).to.equal("span");
        expect(element.tagName).to.equal("SPAN");
        expect(element.innerText).to.equal("Hello World!");
        expect(element.classList.length).to.equal(1);
        expect(element.classList.contains('hello-world')).to.be.true;
    });
    it(`should create a STRONG with "Hello World!" text and custom attribute`, () => {
        const element = createElement("strong", { text: "Hello World!", attrs: { "data-foo": "bar" } });
        expect(element.localName).to.equal("strong");
        expect(element.tagName).to.equal("STRONG");
        expect(element.innerText).to.equal("Hello World!");
        expect(element.hasAttribute("data-foo")).to.be.true;
        expect(element.getAttribute("data-foo")).to.equal("bar");
    });
});