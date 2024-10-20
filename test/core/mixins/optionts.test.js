"use strict";

import { expect } from "chai";
import { OptionsMixin } from "../../../src/core/mixins/options.js";

describe("Options mixin", () => {
    let MyClass;
    before(() => {
        MyClass = class extends OptionsMixin() {
            constructor(args, defaultOptions, options) {
                super(args, defaultOptions, options);
            }
        };
    });
    it(`should correctly assess options for a given class instance`, () => {
        const instance = new MyClass({}, { foo: "bar", bar: "baz" }, { foo: "baz" });
        expect(instance.defaultOptions).to.deep.equal({ foo: "bar", bar: "baz" });
        expect(instance.userOptions).to.deep.equal({ foo: "baz" });
        expect(instance.options).to.deep.equal({ foo: "baz", bar: "baz" });
        expect(instance.getOption("foo")).to.equal("baz");
        expect(instance.hasOption("bar")).to.be.true;
        expect(instance.hasOption("unexisting")).to.be.false;
    });
});