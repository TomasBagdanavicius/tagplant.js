"use strict";

import { expect } from "chai";
import { networkRequest } from "../../../src/process/network-request.js";
import { NetworkInvalidStatusException } from "../../../src/core/network/exceptions.js";

describe("networkRequest", () => {
    it("should throw NetworkResourceNotFoundException for a 404 response", async () => {
        const url = "http://localhost/bin/HTTP/server-error.php";
        const abortController = new AbortController;
        let resolved = false;
        try {
            await networkRequest(url, abortController);
            resolved = true;
        } catch (error) {
            expect(error).to.be.instanceOf(NetworkInvalidStatusException);
        }
        if (resolved) {
            throw new Error("Expected NetworkInvalidStatusException, but none was thrown.");
        }
    });
});