"use strict";

import { expect } from "chai";
import { CancelablePromise, CancelablePromiseAbortException } from "../../../src/core/process/cancelable-promise.js";

describe("CancelablePromise", () => {
    it("should resolve successfully when not aborted", async () => {
        const promise = new CancelablePromise((resolve) => {
            setTimeout(() => resolve("resolved"), 100);
        });
        const result = await promise;
        expect(result).to.equal("resolved");
        expect(promise.state.value).to.equal("fulfilled");
    });
    it("should reject with CancelablePromiseAbortException when aborted via AbortController", async () => {
        const abortController = new AbortController();
        const promise = new CancelablePromise((resolve) => {
            setTimeout(() => resolve("resolved"), 200);
        }, abortController);
        setTimeout(() => abortController.abort(), 100);
        try {
            await promise;
        } catch (error) {
            expect(error).to.be.instanceOf(DOMException);
            expect(error.name).to.equal("AbortError");
            expect(CancelablePromise.isPromiseAbortException(error)).to.be.true;
            expect(promise.state.value).to.equal("rejected");
        }
    });
    it("should reject with ExplicitAbortError when cancel() is called", async () => {
        const promise = new CancelablePromise((resolve) => {
            setTimeout(() => resolve("resolved"), 200);
        });
        setTimeout(() => promise.cancel(), 100);
        try {
            await promise;
        } catch (error) {
            expect(error).to.be.instanceOf(CancelablePromiseAbortException);
            expect(error.message).to.equal("Promise was aborted");
            expect(error.previous.message).to.equal("Aborted by application");
            expect(promise.state.value).to.equal("rejected");
        }
    });
});
