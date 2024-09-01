"use strict";

import { expect } from "chai";
import { Enumeration, EnumerationError, EnumerationMember, enumList } from "../../../../src/core/functions/enumeration.js";

describe("Enumeration", () => {
    let statuses;
    before(() => {
        statuses = enumList({
            pending: "pending",
            running: "running",
            aborted: "aborted",
            error: "error",
            completed: "completed"
        }, "statuses");
    });
    it("should create an instance of Enumeration using enumList", () => {
        expect(statuses).to.be.instanceOf(Enumeration);
    });
    it("should create its properties as instanced of EnumerationMember", () => {
        expect(statuses.pending).to.be.instanceOf(EnumerationMember);
    });
    it("should return a name of the listing", () => {
        expect(statuses._name).to.equal("statuses");
    });
    it("should throw an EnumerationError for an invalid status", () => {
        expect(() => {
            statuses.stuck;
        }).to.throw(EnumerationError);
    });
    it("should throw an EnumerationError when trying to set a custom value", () => {
        expect(() => {
            statuses.custom = "custom";
        }).to.throw(EnumerationError);
    });
    it("should have its properties strictly equal themselves", () => {
        expect(statuses.pending).to.equal(statuses.pending);
    });
    it("should have its properties to not stricly equal other properties", () => {
        expect(statuses.pending).to.not.equal(statuses.running);
    });
    it(`should throw an error if a "_name" property is used in a listing`, () => {
        expect(() => {
            enumList({
                _name: "pending",
                foo: "bar",
            }, "customEnum");
        }).to.throw(EnumerationError);
    });
    it("should have the correct keys in the statuses object", () => {
        const expectedKeys = ["pending", "running", "aborted", "error", "completed"];
        expect(Object.keys(statuses)).to.have.members(expectedKeys);
    });
    it("should have the correct values in the statuses object", () => {
        const expectedValues = [statuses.pending, statuses.running, statuses.aborted, statuses.error, statuses.completed];
        expect(Object.values(statuses)).to.have.members(expectedValues);
    });
});