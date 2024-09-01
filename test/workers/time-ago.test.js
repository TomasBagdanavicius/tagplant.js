"use strict";

import { expect } from "chai";
import { Worker } from "worker_threads";

let worker;
before(() => {
    worker = new Worker("./src/workers/time-ago.js", {
        type: "module",
        workerData: {
            name: "Time Ago",
        }
    });
});
after(() => {
    worker.terminate();
});

describe("Time ago worker", () => {
    it("should return 1 month difference between two dates", done => {
        const currentTime = new Date("2000-02-01T08:00:00Z");
        const pastTime = new Date("2000-01-01T08:00:00Z");
        worker.postMessage([pastTime, currentTime, false]);
        worker.once("message", message => {
            const [timeNumber, timeUnit] = message;
            expect(timeNumber).to.equal(1);
            expect(timeUnit).to.equal("months");
            done();
        });
    });
    it("should return 1 day difference between two dates", done => {
        const currentTime = new Date("2000-01-02T08:00:00Z");
        const pastTime = new Date("2000-01-01T08:00:00Z");
        worker.postMessage([pastTime, currentTime, false]);
        worker.once("message", message => {
            const [timeNumber, timeUnit] = message;
            expect(timeNumber).to.equal(1);
            expect(timeUnit).to.equal("days");
            done();
        });
    });
    it("should return 1 hour difference between two dates exactly 1 hour apart", done => {
        const currentTime = new Date("2000-01-01T09:00:00Z");
        const pastTime = new Date("2000-01-01T08:00:00Z");
        worker.postMessage([pastTime, currentTime, false]);
        worker.once("message", message => {
            const [timeNumber, timeUnit] = message;
            expect(timeNumber).to.equal(1);
            expect(timeUnit).to.equal("hours");
            done();
        });
    });
    it("should return 1 hour difference between two dates with more than 1 hour but less than 2 hours difference", done => {
        const currentTime = new Date("2000-01-01T09:30:00Z");
        const pastTime = new Date("2000-01-01T08:00:00Z");
        worker.postMessage([pastTime, currentTime, false]);
        worker.once("message", message => {
            const [timeNumber, timeUnit] = message;
            expect(timeNumber).to.equal(1);
            expect(timeUnit).to.equal("hours");
            done();
        });
    });
    it("should return 'just now' when the time difference is 2 seconds", done => {
        const currentTime = new Date("2000-01-01T08:00:02Z");
        const pastTime = new Date("2000-01-01T08:00:00Z");
        worker.postMessage([pastTime, currentTime, false]);
        worker.once("message", message => {
            const [timeNumber, timeUnit] = message;
            expect(timeNumber).to.be.undefined;
            expect(timeUnit).to.equal("just now");
            done();
        });
    });
    it("should return '2 minutes' when the time difference is 2 minutes", done => {
        const currentTime = new Date("2000-01-01T08:02:00Z");
        const pastTime = new Date("2000-01-01T08:00:00Z");
        worker.postMessage([pastTime, currentTime, false]);
        worker.once("message", message => {
            const [timeNumber, timeUnit] = message;
            expect(timeNumber).to.equal(2);
            expect(timeUnit).to.equal("minutes");
            done();
        });
    });
});