"use strict";

import { expect } from "chai";
import { mergeOptions } from "../../../../src/core/functions/object.js";

describe("mergeOptions", () => {
    it("should merge options with custom values overriding defaults", () => {
        let defaultOptions = { foo: "bar", lorem: "dolor" };
        let customOptions = { bar: "baz", lorem: "ipsum" };
        const result = mergeOptions(defaultOptions, customOptions);
        expect(result).to.deep.equal({ foo: "bar", lorem: "ipsum", bar: "baz" });
    });
    it("should merge options with custom values overriding defaults, and also merge specified leafs", () => {
        let defaultOptions = { foo: "bar", lorem: "dolor", classes: ["one"], props: { one: "One" } };
        let customOptions = { bar: "baz", lorem: "ipsum", classes: ["two"], props: { two: "Two" } };
        const result = mergeOptions(defaultOptions, customOptions, ["classes", "props"]);
        expect(result).to.deep.equal({
            foo: "bar",
            lorem: "ipsum",
            classes: ["one", "two"],
            props: { one: "One", two: "Two" },
            bar: "baz"
        });
    });
});