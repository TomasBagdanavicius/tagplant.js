"use strict";

import { expect } from "chai";
import { iterableToSlottedElement } from "../../../../src/core/web-component/functions.js";

describe("iterableToSlottedElement", () => {
    it("should create an element with slotted children from iterable", () => {
        const iterable = new Map([
            ["slot1", document.createElement("p")],
            ["slot2", "Hello World"]
        ]);
        const webComponent = iterableToSlottedElement(iterable);
        const slot1 = webComponent.querySelector('p[slot="slot1"]');
        const slot2 = webComponent.querySelector('[slot="slot2"]');
        expect(webComponent).to.be.instanceOf(window.HTMLElement);
        expect(slot1).to.exist;
        expect(slot2).to.exist;
        expect(slot2.textContent).to.equal("Hello World");
    });
});