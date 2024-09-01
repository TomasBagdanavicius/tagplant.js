"use strict";

import { expect } from "chai";
import { wrapSubstringsWithElement } from "../../../../src/core/functions/string.js";

describe("wrapSubstringsWithElement", () => {
    it("should wrap substrings with specified HTML element and handle case sensitivity", () => {
        const result = wrapSubstringsWithElement("Lorem ipsum dolor sit amet", "or", "mark", true, true);
        expect(result).to.be.instanceOf(DocumentFragment);
        const nodes = Array.from(result.childNodes);
        expect(nodes).to.have.lengthOf(5);
        expect(nodes[0].nodeType).to.equal(Node.TEXT_NODE);
        expect(nodes[0].textContent).to.equal("L");
        expect(nodes[1].nodeName.toLowerCase()).to.equal("mark");
        expect(nodes[1].textContent).to.equal("or");
        expect(nodes[2].nodeType).to.equal(Node.TEXT_NODE);
        expect(nodes[2].textContent).to.equal("em ipsum dol");
        expect(nodes[3].nodeName.toLowerCase()).to.equal("mark");
        expect(nodes[3].textContent).to.equal("or");
        expect(nodes[4].nodeType).to.equal(Node.TEXT_NODE);
        expect(nodes[4].textContent).to.equal(" sit amet");
    });
});