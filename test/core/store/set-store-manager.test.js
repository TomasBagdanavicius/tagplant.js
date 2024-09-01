"use strict";

import { expect } from "chai";
import sinon from "sinon";
import { SetStoreManager } from "../../../src/core/store/set-store-manager.js";

let manager;
let addEventListenerSpy;
let deleteEventListenerSpy;
let deleteManyEventListenerSpy;
before(() => {
    const set = new Set(["One", "Two", "Three", "Four", "Five" ]);
    manager = new SetStoreManager(set);
    // Create a spy for the event listener callback
    addEventListenerSpy = sinon.spy();
    manager.addEventListener("add", addEventListenerSpy);
    deleteEventListenerSpy = sinon.spy();
    manager.addEventListener("delete", deleteEventListenerSpy);
    deleteManyEventListenerSpy = sinon.spy();
    manager.addEventListener("deletemany", deleteManyEventListenerSpy);
});

describe("SetStoreManager", () => {
    it("should return the correct size", () => {
        expect(manager.getSize()).to.equal(5);
    });
    it("should return true for existing keys", () => {
        expect(manager.hasKey("Two")).to.be.true;
        expect(manager.hasKey("Four")).to.be.true;
        expect(manager.hasKey("Five")).to.be.true;
    });
    it("should return false for non-existing keys", () => {
        expect(manager.hasKey("Twenty")).to.be.false;
        expect(manager.hasKey("Sixty")).to.be.false;
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
        expect(manager.hasKey("Six")).to.be.true;
        expect(manager.hasKey("Seven")).to.be.true;
        expect(manager.hasKey("Eight")).to.be.true;
    });
    it("should correctly delete single and multiple keys", () => {
        let eventArgs;
        expect(manager.delete("One")).to.be.true;
        sinon.assert.calledOnce(deleteEventListenerSpy);
        eventArgs = deleteEventListenerSpy.getCall(0).args[0];
        expect(eventArgs.detail).to.deep.equal({
            total: 7,
            reason: undefined,
            key: "One"
        });
        expect(manager.delete("Unexisting")).to.be.null;
        sinon.assert.calledOnce(deleteEventListenerSpy);
        expect(manager.deleteMany(["Two", "Three"])).to.deep.equal({
            successKeys: ["Two", "Three"],
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
            keys: ["Two", "Three"]
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
        expect(result[0][0]).to.equal("Five");
        expect(result[1][0]).to.equal("Seven");
        expect(result[2][0]).to.equal("Eight");
    });
});