"use strict";

import { expect } from "chai";
import { onAttributeChange } from "../../../../src/core/functions/node.js";

before(() => {
    global.MutationObserver = window.MutationObserver;
});

describe("onAttributeChange", () => {
    it("should resolve when the element's attribute is changed", () => {
        const element = document.createElement("div");
        document.body.append(element);
        let resolved = false;
        onAttributeChange(element, "data-name", ({ newValue, oldValue, attrName }) => {
            expect(newValue).to.equal("foo");
            expect(oldValue).to.be.null;
            expect(attrName).to.equal("data-name");
            resolved = true;
        });
        element.setAttribute("data-name", "foo");
        setTimeout(() => {
            if (!resolved) {
                expect.fail(new Error("`onAttributeChange` has not run"));
            }
        }, 0);
    });
});