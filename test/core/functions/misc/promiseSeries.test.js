"use strict";

import { expect } from "chai";
import { promiseSeries } from "../../../../src/core/functions/misc.js";
import { demoTasksQuick } from "../../../../demo/helpers/helpers.js";
import { PromiseSeriesAbortException } from "../../../../src/core/exceptions.js";

describe("promiseSeries", () => {
    it("should resolve the promises in series and return their results", async () => {
        let values;
        try {
            values = await promiseSeries(demoTasksQuick);
        } catch (error) {
            expect.fail(error);
        }
        expect(values).to.deep.equal(["outline", "background-color", undefined]);
    });
    it("should abort a series of promises", done => {
        const abortController = new AbortController;
        setTimeout(() => {
            abortController.abort();
        }, 20);
        promiseSeries(demoTasksQuick, { signal: abortController.signal }).then(() => {
            done(new Error("Promise series was not supposed to finish"));
        }).catch(error => {
            try {
                expect(error).to.be.instanceOf(PromiseSeriesAbortException);
                done();
            } catch (assertionError) {
                done(assertionError);
            }
        });
    });
});