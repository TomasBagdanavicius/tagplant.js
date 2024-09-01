"use strict";

import { expect } from "chai";
import sinon from "sinon";
import { ObjectStoreManager } from "../../../src/core/store/object-store-manager.js";

let manager;
let addEventListenerSpy;
let deleteEventListenerSpy;
let deleteManyEventListenerSpy;
before(() => {
    const object = { one: "One", two: "Two", three: "Three", four: "Four", five: "Five" };
    manager = new ObjectStoreManager(object);
    // Create a spy for the event listener callback
    addEventListenerSpy = sinon.spy();
    manager.addEventListener("add", addEventListenerSpy);
    deleteEventListenerSpy = sinon.spy();
    manager.addEventListener("delete", deleteEventListenerSpy);
    deleteManyEventListenerSpy = sinon.spy();
    manager.addEventListener("deletemany", deleteManyEventListenerSpy);
});

describe("ObjectStoreManager", () => {
    it("should return the correct size", () => {
        expect(manager.getSize()).to.equal(5);
    });
    it("should return true for existing keys", () => {
        expect(manager.hasKey("one")).to.be.true;
        expect(manager.hasKey("two")).to.be.true;
        expect(manager.hasKey("five")).to.be.true;
    });
    it("should return false for non-existing keys", () => {
        expect(manager.hasKey("twenty")).to.be.false;
        expect(manager.hasKey("sixty")).to.be.false;
    });
    it("should add new key-value pairs correctly", () => {
        let eventArgs;
        manager.add("Six", "six");
        sinon.assert.calledOnce(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(0).args[0];
        expect(eventArgs.detail).to.deep.equal({
            key: "six",
            element: "Six"
        });
        manager.add("Seven", "seven");
        sinon.assert.calledTwice(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(1).args[0];
        expect(eventArgs.detail).to.deep.equal({
            key: "seven",
            element: "Seven"
        });
        manager.add("Eight", "eight");
        sinon.assert.calledThrice(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(2).args[0];
        expect(eventArgs.detail).to.deep.equal({
            key: "eight",
            element: "Eight"
        });
        expect(manager.getSize()).to.equal(8);
        expect(manager.hasKey("six")).to.be.true;
        expect(manager.hasKey("seven")).to.be.true;
        expect(manager.hasKey("eight")).to.be.true;
    });
    it("should correctly delete single and multiple keys", () => {
        let eventArgs;
        expect(manager.delete("one")).to.be.true;
        sinon.assert.calledOnce(deleteEventListenerSpy);
        eventArgs = deleteEventListenerSpy.getCall(0).args[0];
        expect(eventArgs.detail).to.deep.equal({
            total: 7,
            reason: undefined,
            key: "one"
        });
        expect(manager.delete("lorem")).to.be.null;
        sinon.assert.calledOnce(deleteEventListenerSpy);
        expect(manager.deleteMany(["two", "three"])).to.deep.equal({
            successKeys: ["two", "three"],
            errors: [],
            successCount: 2,
            errorCount: 0,
            notFoundKeys: []
        });
        sinon.assert.calledOnce(deleteManyEventListenerSpy);
        eventArgs = deleteManyEventListenerSpy.getCall(0).args[0];
        expect(eventArgs.detail).to.deep.equal({
            total: 5,
            reason: undefined,
            keys: ["two", "three"]
        });
        expect(manager.deleteMany(["lorem", "ipsum"])).to.deep.equal({
            successKeys: [],
            errors: [],
            successCount: 0,
            errorCount: 0,
            notFoundKeys: ["lorem", "ipsum"]
        });
        sinon.assert.calledOnce(deleteManyEventListenerSpy);
    });
    it("should return the correct results for search parameters", () => {
        const { result } = manager.applySearchParams({ search: "e" });
        expect(Object.keys(result).length).to.equal(3);
        expect(result[0][0]).to.equal("five");
        expect(result[1][0]).to.equal("seven");
        expect(result[2][0]).to.equal("eight");
    });
});