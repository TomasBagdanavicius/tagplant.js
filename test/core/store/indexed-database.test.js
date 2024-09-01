"use strict";

import "fake-indexeddb/auto";
import { expect } from "chai";
import { landingDatabase as database } from "../../../var/indexed-databases.js";

// It assigns indexedDB onto the window (which is actually available through environment setup)
global.indexedDB = window.indexedDB;

const expectedStructure = {
    color: { name: "color", value: "white" },
    width: { name: "width", value: "100px" },
    height: { name: "height", value: "200px" }
};

describe("Indexed database", () => {
    it("should open and close without errors", async () => {
        try {
            await database.open();
            database.close();
        } catch (error) {
            throw new Error("Could not open or close database: " + error.message);
        }
    });
    it("should put records without errors", async () => {
        try {
            await database.open();
            await database.putRecord("settings", "color", { value: "white" });
            await database.putRecord("settings", "width", { value: "100px" });
            await database.putRecord("settings", "height", { value: "200px" });
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        } finally {
            database.close();
        }
    });
    it("should get records without errors", async () => {
        try {
            await database.open();
            let record;
            record = await database.getRecord("settings", "color");
            expect(record).to.deep.equal(expectedStructure["color"]);
            record = await database.getRecord("settings", "width");
            expect(record).to.deep.equal(expectedStructure["width"]);
            record = await database.getRecord("settings", "height");
            expect(record).to.deep.equal(expectedStructure["height"]);
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        } finally {
            database.close();
        }
    });
    it("should get correct record count", async () => {
        try {
            await database.open();
            const count = await database.recordCount("settings");
            expect(count).to.equal(3);
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        } finally {
            database.close();
        }
    });
    it("should return async iterator", async () => {
        try {
            await database.open();
            const recordsAsyncIterator = database.records("settings");
            expect(Symbol.asyncIterator in Object(recordsAsyncIterator)).to.be.true;
            for await (const [keyValue, record] of recordsAsyncIterator) {
                expect(record).to.deep.equal(expectedStructure[keyValue]);
            }
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        } finally {
            database.close();
        }
    });
    it("should delete record without errors", async () => {
        try {
            await database.open();
            await database.deleteRecord("settings", "color");
            const record = await database.getRecord("settings", "color");
            expect(record).to.be.null;
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        } finally {
            database.close();
        }
    });
    it("should delete multiple records without errors", async () => {
        try {
            await database.open();
            const info = await database.deleteMultipleRecords("settings", ["width", "height"]);
            expect(info).to.deep.equal({
                successKeys: ["width", "height"],
                errors: [],
                successCount: 2,
                errorCount: 0,
                notFoundKeys: []
            });
            const record1 = await database.getRecord("settings", "width");
            expect(record1).to.be.null;
            const record2 = await database.getRecord("settings", "height");
            expect(record2).to.be.null;
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        } finally {
            database.close();
        }
    });
    it("should retrieve keyPath without errors", async () => {
        try {
            await database.open();
            const keyPath = database.getKeyPath("settings");
            expect(keyPath).to.equal("name");
        } catch (error) {
            throw new Error("Database operation failed: " + error.message);
        } finally {
            database.close();
        }
    });
});