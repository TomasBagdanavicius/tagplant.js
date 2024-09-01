"use strict";

import { expect } from "chai";
import sinon from "sinon";
import { ArrayStoreManager } from "../../../src/core/store/array-store-manager.js";

let manager;
let addEventListenerSpy;
let deleteEventListenerSpy;
let deleteManyEventListenerSpy;
before(() => {
    const array = ["One", "Two", "Three", "Four", "Five"];
    manager = new ArrayStoreManager(array);
    // Create a spy for the event listener callback
    addEventListenerSpy = sinon.spy();
    manager.addEventListener("add", addEventListenerSpy);
    deleteEventListenerSpy = sinon.spy();
    manager.addEventListener("delete", deleteEventListenerSpy);
    deleteManyEventListenerSpy = sinon.spy();
    manager.addEventListener("deletemany", deleteManyEventListenerSpy);
});

describe("ArrayStoreManager", () => {
    it("should return the correct size", () => {
        expect(manager.getSize()).to.equal(5);
    });
    it("should return true for existing keys", () => {
        expect(manager.hasKey(0)).to.be.true;
        expect(manager.hasKey(2)).to.be.true;
        expect(manager.hasKey(4)).to.be.true;
    });
    it("should return false for non-existing keys", () => {
        expect(manager.hasKey(100)).to.be.false;
        expect(manager.hasKey(-1)).to.be.false;
    });
    it("should add new key-value pairs correctly", () => {
        let eventArgs;
        manager.add("Six");
        sinon.assert.calledOnce(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(0).args[0];
        expect(eventArgs.detail).to.deep.equal({
            position: -1,
            element: "Six"
        });
        manager.add("Seven");
        sinon.assert.calledTwice(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(1).args[0];
        expect(eventArgs.detail).to.deep.equal({
            position: -1,
            element: "Seven"
        });
        manager.add("Eight");
        sinon.assert.calledThrice(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(2).args[0];
        expect(eventArgs.detail).to.deep.equal({
            position: -1,
            element: "Eight"
        });
        expect(manager.getSize()).to.equal(8);
        expect(manager.hasKey(5)).to.be.true;
        expect(manager.hasKey(6)).to.be.true;
        expect(manager.hasKey(7)).to.be.true;
    });
    it("should correctly delete single and multiple keys", () => {
        let eventArgs;
        expect(manager.delete(0)).to.be.true;
        sinon.assert.calledOnce(deleteEventListenerSpy);
        eventArgs = deleteEventListenerSpy.getCall(0).args[0];
        expect(eventArgs.detail).to.deep.equal({
            total: 7,
            reason: undefined,
            key: 0
        });
        expect(manager.delete(100)).to.be.null;
        sinon.assert.calledOnce(deleteEventListenerSpy);
        expect(manager.deleteMany([1, 2])).to.deep.equal({
            successKeys: [1, 2],
            errors: [],
            successCount: 2,
            errorCount: 0,
            notFoundKeys: []
        });
        sinon.assert.calledOnce(deleteManyEventListenerSpy);
        eventArgs = deleteManyEventListenerSpy.getCall(0).args[0];
        expect(eventArgs.detail).to.deep.equal({
            keys: [1, 2]
        });
        expect(manager.deleteMany([100, 101])).to.deep.equal({
            successKeys: [],
            errors: [],
            successCount: 0,
            errorCount: 0,
            notFoundKeys: [100, 101]
        });
        sinon.assert.calledOnce(deleteManyEventListenerSpy);
    });
    it("should return the correct results for search parameters", () => {
        const { result } = manager.applySearchParams({ search: "e" });
        expect(Object.keys(result).length).to.equal(3);
        expect(result[0][1].value).to.equal("Five");
        expect(result[1][1].value).to.equal("Seven");
        expect(result[2][1].value).to.equal("Eight");
    });
});