"use strict";

import { expect } from "chai";
import { createSlottedTemplate } from "../../../../src/core/web-component/functions.js";

describe("createSlottedTemplate", () => {
    it("should create a template element with slotted children", () => {
        const data = [
            { name: "slot1" },
            { name: "slot2" },
            document.createElement("div")
        ];
        const template = createSlottedTemplate(data);
        const slot1 = template.content.querySelector('slot[name="slot1"]');
        const slot2 = template.content.querySelector('slot[name="slot2"]');
        const div = template.content.querySelector("div");
        expect(template).to.be.instanceOf(window.HTMLTemplateElement);
        expect(slot1).to.exist;
        expect(slot2).to.exist;
        expect(div).to.exist;
    });
});