"use strict";

import { expect } from "chai";
import { ElementChildrenCountable, MappedChildren, ElementRepresentative } from "../../../src/core/element/element-representative.js";

describe("ElementChildrenCountable", () => {
    it("should count children correctly", () => {
        const elem = document.createElement("div");
        elem.innerHTML = "<span></span><span></span>";
        class TestElement extends ElementChildrenCountable({}) {}
        const instance = new TestElement(elem);
        expect(instance.countChildren).to.equal(2);
    });
    it("should count children using a custom count formula", () => {
        const elem = document.createElement("div");
        elem.innerHTML = "<span></span><span></span><span></span>";
        class TestElement extends ElementChildrenCountable({
            countFormula: (count) => count * 2
        }) {}
        const instance = new TestElement(elem);
        expect(instance.countChildren).to.equal(6);
    });
});
describe("MappedChildren", () => {
    it("should add and remove children and update the internal map", () => {
        const elem = document.createElement("div");
        class TestElement extends MappedChildren({}) {}
        const instance = new TestElement(elem);
        const child1 = document.createElement("span");
        const child2 = document.createElement("span");
        elem.appendChild(child1);
        elem.appendChild(child2);
        // Next session
        setTimeout(() => {
            expect(instance.dataItemsMap.size).to.equal(2);
            elem.removeChild(child1);
            setTimeout(() => {
                expect(instance.dataItemsMap.size).to.equal(1);
            }, 0);
        }, 0);
    });
    it("should assign keys to children correctly", () => {
        const elem = document.createElement("div");
        class TestElement extends MappedChildren({}) {}
        const instance = new TestElement(elem);
        const child = document.createElement("span");
        elem.appendChild(child);
        const key = instance.setChildKey(child);
        expect(instance.hasKey(key)).to.be.true;
        expect(instance.getByKey(key)).to.equal(child);
    });
});

describe("ElementRepresentative", () => {
    it("should dispatch connectedfirst event when element is connected", (done) => {
        const elem = document.createElement("div");
        class TestElement extends ElementRepresentative {}
        const instance = new TestElement(elem);
        instance.addEventListener("connectedfirst", () => {
            done();
        });
        document.body.appendChild(elem);
    });
    it("should attach and detach an element correctly", () => {
        const elem = document.createElement("div");
        class TestElement extends ElementRepresentative {}
        const instance = new TestElement(elem);
        instance.attach(document.body);
        expect(instance.isAttached).to.be.true;
        instance.detach();
        expect(instance.isDetached).to.be.true;
    });
    it("should create a standard header schema correctly", () => {
        const schema = ElementRepresentative.getStandardHeaderSchema("My Title", {
            classes: ["header-class"],
            headingLevel: { value: "h3" },
            headingClasses: ["heading-class"]
        });
        expect(schema).to.deep.equal({
            tag: "header",
            options: {
                classes: ["header-class"],
                elems: [{
                    tag: "h3",
                    options: {
                        text: "My Title",
                        classes: ["heading-class"]
                    },
                    ref: "heading"
                }]
            },
            ref: "header"
        });
    });
});