"use strict";

import "fake-indexeddb/auto";
import { expect } from "chai";
import { landingDatabaseManager } from "../../../var/indexed-databases.js";
import { sortDirection } from "../../../src/core/functions/enumeration.js";

// It assigns indexedDB onto the window (which is actually available through environment setup)
global.indexedDB = window.indexedDB;

const expectedStructure = {
    color: { name: "color", value: "white" },
    width: { name: "width", value: "100px" },
    height: { name: "height", value: "200px" }
};

describe("Indexed database manager", () => {
    it("should correctly save values", async () => {
        const abortController = new AbortController;
        try {
            await landingDatabaseManager.saveValue("settings", "color", { value: "white" }, { signal: abortController.signal });
            await landingDatabaseManager.saveValue("settings", "width", { value: "100px" }, { signal: abortController.signal });
            await landingDatabaseManager.saveValue("settings", "height", { value: "200px" }, { signal: abortController.signal });
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        }
    });
    it("should correctly return the count number", async () => {
        const abortController = new AbortController;
        try {
            const count = await landingDatabaseManager.recordCount("settings", { signal: abortController.signal });
            expect(count).to.equal(3);
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        }
    });
    it("should correctly read values", async () => {
        const abortController = new AbortController;
        try {
            let record;
            record = await landingDatabaseManager.readValue("settings", "color", { signal: abortController.signal });
            expect(record).to.deep.equal(expectedStructure["color"]);
            record = await landingDatabaseManager.readValue("settings", "width", { signal: abortController.signal });
            expect(record).to.deep.equal(expectedStructure["width"]);
            record = await landingDatabaseManager.readValue("settings", "height", { signal: abortController.signal });
            expect(record).to.deep.equal(expectedStructure["height"]);
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        }
    });
    it("should correctly retrieve records", async () => {
        const abortController = new AbortController;
        try {
            const records = await landingDatabaseManager.records("settings", { sort: "name", order: sortDirection.asc, signal: abortController.signal });
            const order = [];
            for await (const [keyValue, record] of records) {
                expect(record).to.deep.equal(expectedStructure[keyValue]);
                order.push(keyValue);
            }
            expect(order).to.deep.equal(["color", "height", "width"]);
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        }
    });
    it("should correctly retrieve records containing given search term", async () => {
        const abortController = new AbortController;
        try {
            const records = await landingDatabaseManager.recordsWithSearchTerm("settings", "p", { signal: abortController.signal });
            const keys = [];
            for await (const [keyValue] of records) {
                keys.push(keyValue);
            }
            expect(keys).to.deep.equal(["height", "width"]);
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        }
    });
});