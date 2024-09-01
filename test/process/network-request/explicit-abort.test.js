"use strict";

import { expect } from "chai";
import { networkRequest } from "../../../src/process/network-request.js";
import { ExplicitAbortError } from "../../../src/core/exceptions.js";
import { NetworkAbortException } from "../../../src/core/network/exceptions.js";

describe("networkRequest with AbortController", () => {
    it("should throw NetworkAbortException when aborted by user", async () => {
        const abortController = new AbortController;
        const url = "http://localhost/bin/PHP/sleep.php?seconds=1";
        setTimeout(() => {
            abortController.abort(new ExplicitAbortError("Aborted by user"));
        }, 100);
        let resolved = false;
        try {
            await networkRequest(url, abortController, {
                timeout: 10000,
            });
            resolved = true;
        } catch (error) {
            expect(error).to.be.instanceOf(NetworkAbortException);
        }
        if (resolved) {
            throw new Error("Expected NetworkAbortException, but none was thrown.");
        }
    });
});