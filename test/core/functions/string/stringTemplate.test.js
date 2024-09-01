"use strict";

import { expect } from "chai";
import { stringTemplate, StringTemplate } from "../../../../src/core/functions/string.js";

describe("StringTemplate", () => {
    it("should create an instance of StringTemplate using stringTemplate", () => {
        const template = stringTemplate`${"text"} ${"foo"}`;
        expect(template).to.be.instanceOf(StringTemplate);
    });
    it("should format the template correctly", () => {
        const template = stringTemplate`${"text"} ${"foo"}`;
        const result = template.format({ text: "Lorem ipsum", foo: "bar" });
        expect(result).to.equal("Lorem ipsum bar");
    });
    it("should create a StringTemplate instance using StringTemplate.fromString", () => {
        const template = StringTemplate.fromString("foo {{param}} baz", /{{(.*?)}}/g);
        expect(template).to.be.instanceOf(StringTemplate);
    });
    it("should format the StringTemplate instance correctly", () => {
        const template = StringTemplate.fromString("foo {{param}} baz", /{{(.*?)}}/g);
        const result = template.format({ param: "bar" });
        expect(result).to.equal("foo bar baz");
    });
});