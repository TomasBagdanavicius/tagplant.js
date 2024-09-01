"use strict";

import { expect } from "chai";
import sinon from "sinon";
import { IndexedDBStoreManager } from "../../../src/core/store/indexed-db-store-manager.js";
import { landingDatabase as database, landingDatabaseManager } from "../../../var/indexed-databases.js";

global.indexedDB = window.indexedDB;

let manager;
let addEventListenerSpy;
let deleteEventListenerSpy;
let deleteManyEventListenerSpy;
before(() => {
    manager = new IndexedDBStoreManager(landingDatabaseManager, "settings");
    // Create a spy for the event listener callback
    addEventListenerSpy = sinon.spy();
    manager.addEventListener("add", addEventListenerSpy);
    deleteEventListenerSpy = sinon.spy();
    manager.addEventListener("delete", deleteEventListenerSpy);
    deleteManyEventListenerSpy = sinon.spy();
    manager.addEventListener("deletemany", deleteManyEventListenerSpy);
});

describe("IndexedDBStoreManager", () => {
    it("should put records without errors", async () => {
        try {
            await database.open();
            await database.putRecord("settings", "color", { value: "white" });
            await database.putRecord("settings", "width", { value: "100px" });
            await database.putRecord("settings", "height", { value: "200px" });
            await database.putRecord("settings", "background", { value: "black" });
            await database.putRecord("settings", "opacity", { value: 0.5 });
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        } finally {
            database.close();
        }
    });
    it("should return the correct size", async () => {
        expect(await manager.getSize()).to.equal(5);
    });
    it("should return true for existing keys", async () => {
        expect(await manager.hasKey("color")).to.be.true;
        expect(await manager.hasKey("height")).to.be.true;
        expect(await manager.hasKey("background")).to.be.true;
    });
    it("should return false for non-existing keys", async () => {
        expect(await manager.hasKey(100)).to.be.false;
        expect(await manager.hasKey(-1)).to.be.false;
    });
    it("should add new key-value pairs correctly", async () => {
        let eventArgs;
        await manager.add({ name: "foo", value: "bar" }, "foo");
        sinon.assert.calledOnce(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(0).args[0];
        expect(eventArgs.detail).to.deep.equal({
            key: "foo",
            position: -1,
            element: { name: "foo", value: "bar" }
        });
        await manager.add({ name: "bar", value: "baz" }, "bar");
        sinon.assert.calledTwice(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(1).args[0];
        expect(eventArgs.detail).to.deep.equal({
            key: "bar",
            position: -1,
            element: { name: "bar", value: "baz" }
        });
        await manager.add({ name: "baz", value: "foo" }, "baz");
        sinon.assert.calledThrice(addEventListenerSpy);
        eventArgs = addEventListenerSpy.getCall(2).args[0];
        expect(eventArgs.detail).to.deep.equal({
            key: "baz",
            position: -1,
            element: { name: "baz", value: "foo" }
        });
        expect(await manager.getSize()).to.equal(8);
        expect(await manager.hasKey("foo")).to.be.true;
        expect(await manager.hasKey("bar")).to.be.true;
        expect(await manager.hasKey("baz")).to.be.true;
    });
    it("should correctly delete single and multiple keys", async () => {
        let eventArgs;
        expect(await manager.delete("color")).to.be.true;
        sinon.assert.calledOnce(deleteEventListenerSpy);
        eventArgs = deleteEventListenerSpy.getCall(0).args[0];
        expect(eventArgs.detail).to.deep.equal({
            total: 7,
            reason: undefined,
            key: "color"
        });
        const une = await manager.delete("unexisting");
        expect(une).to.be.null;
        sinon.assert.calledOnce(deleteEventListenerSpy);
        expect(await manager.deleteMany(["width", "height"])).to.deep.equal({
            successKeys: ["width", "height"],
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
            keys: ["width", "height"],
        });
        expect(await manager.deleteMany(["lorem", "ipsum"])).to.deep.equal({
            successKeys: [],
            errors: [],
            successCount: 0,
            errorCount: 0,
            notFoundKeys: ["lorem", "ipsum"]
        });
        sinon.assert.calledOnce(deleteManyEventListenerSpy);
    });
    it("should return the correct results for search parameters", async () => {
        const { result } = await manager.applySearchParams({ search: "c" });
        expect(Object.keys(result).length).to.equal(2);
        expect(result[0][0]).to.equal("background");
        expect(result[1][0]).to.equal("opacity");
    });
});