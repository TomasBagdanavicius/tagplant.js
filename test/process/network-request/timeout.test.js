"use strict";

import { expect } from "chai";
import { networkRequest } from "../../../src/process/network-request.js";
import { NetworkTimeoutException } from "../../../src/core/network/exceptions.js";

describe("networkRequest", () => {
    it("should throw NetworkTimeoutException when request times out", async () => {
        const url = "http://localhost/bin/PHP/sleep.php?seconds=1";
        const abortController = new AbortController;
        let resolved = false;
        try {
            await networkRequest(url, abortController, {
                timeout: 500,
            });
            resolved = true;
        } catch (error) {
            expect(error).to.be.instanceOf(NetworkTimeoutException);
        }
        if (resolved) {
            throw new Error("Expected NetworkTimeoutException, but none was thrown.");
        }
    });
});