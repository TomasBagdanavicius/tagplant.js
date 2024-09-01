"use strict";

import { expect } from "chai";
import sinon from "sinon";
import { MapStoreManager } from "../../../src/core/store/map-store-manager.js";

let manager;
let addEventListenerSpy;
let deleteEventListenerSpy;
let deleteManyEventListenerSpy;
before(() => {
    const map = new Map([
        [1, "One"],
        [2, "Two"],
        [3, "Three"],
        [4, "Four"],
        [5, "Five"],
    ]);
    manager = new MapStoreManager(map);
    // Create a spy for the event listener callback
    addEventListenerSpy = sinon.spy();
    manager.addEventListener("add", addEventListenerSpy);
    deleteEventListenerSpy = sinon.spy();
    manager.addEventListener("delete", deleteEventListenerSpy);
    deleteManyEventListenerSpy = sinon.spy();
    manager.addEventListener("deletemany", deleteManyEventListenerSpy);
});

describe("MapStoreManager", () => {
    it("should return the correct size", () => {
        expect(manager.getSize()).to.equal(5);
    });
    it("should return true for existing keys", () => {
        expect(manager.hasKey(1)).to.be.true;
        expect(manager.hasKey(2)).to.be.true;
        expect(manager.hasKey(5)).to.be.true;
    });
    it("should return false for non-existing keys", () => {
        expect(manager.hasKey(100)).to.be.false;
        expect(manager.hasKey(-1)).to.be.false;
    });
    it("should add new key-value pairs correctly", () => {
        let eventArgs;
        manager.add("Six", 6);
        sinon.assert.calledOnce(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(0).args[0];
        expect(eventArgs.detail).to.deep.equal({
            key: 6,
            position: -1,
            element: "Six"
        });
        manager.add("Seven", 7);
        sinon.assert.calledTwice(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(1).args[0];
        expect(eventArgs.detail).to.deep.equal({
            key: 7,
            position: -1,
            element: "Seven"
        });
        manager.add("Eight", 8);
        sinon.assert.calledThrice(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(2).args[0];
        expect(eventArgs.detail).to.deep.equal({
            key: 8,
            position: -1,
            element: "Eight"
        });
        expect(manager.getSize()).to.equal(8);
        expect(manager.hasKey(6)).to.be.true;
        expect(manager.hasKey(7)).to.be.true;
        expect(manager.hasKey(8)).to.be.true;
    });
    it("should correctly delete single and multiple keys", () => {
        let eventArgs;
        expect(manager.delete(1)).to.be.true;
        sinon.assert.calledOnce(deleteEventListenerSpy);
        eventArgs = deleteEventListenerSpy.getCall(0).args[0];
        expect(eventArgs.detail).to.deep.equal({
            total: 7,
            reason: undefined,
            key: 1
        });
        expect(manager.delete(100)).to.be.null;
        sinon.assert.calledOnce(deleteEventListenerSpy);
        expect(manager.deleteMany([3, 4])).to.deep.equal({
            successKeys: [3, 4],
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
            keys: [3, 4]
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
        expect(result[0][0]).to.equal(5);
        expect(result[1][0]).to.equal(7);
        expect(result[2][0]).to.equal(8);
    });
});