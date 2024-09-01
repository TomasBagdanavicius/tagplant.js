"use strict";

import { expect } from "chai";
import { createAndDefineCustomElement } from "../../../../src/core/web-component/functions.js";

global.customElements = global.window.customElements;

describe("createAndDefineCustomElement", () => {
    it("should define a new custom element", () => {
        const template = document.createElement("template");
        template.innerHTML = "<div>Content</div>";
        createAndDefineCustomElement("test-element", { template });
        const el = document.createElement("test-element");
        expect(el).to.be.instanceOf(window.HTMLElement);
        expect(el.shadowRoot).to.exist;
    });
    it("should throw an error if element name is duplicated and throwOnDuplicate is true", () => {
        const template = document.createElement("template");
        template.innerHTML = "<div>Content</div>";
        createAndDefineCustomElement("test-element-duplicate", { template });
        expect(() => {
            createAndDefineCustomElement("test-element-duplicate", { template });
        }).to.throw(DOMException, "Custom element with name test-element-duplicate is already defined");
    });
    it("should not throw an error if element name is duplicated and throwOnDuplicate is false", () => {
        const template = document.createElement("template");
        template.innerHTML = "<div>Content</div>";
        createAndDefineCustomElement("test-element-no-duplicate", { template });
        expect(() => {
            createAndDefineCustomElement("test-element-no-duplicate", { template, throwOnDuplicate: false });
        }).to.not.throw();
    });
});