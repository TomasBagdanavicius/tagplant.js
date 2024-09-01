"use strict";

import { expect } from "chai";
import { networkRequest } from "../../../src/process/network-request.js";
import { NetworkResourceNotFoundException } from "../../../src/core/network/exceptions.js";

describe("networkRequest", () => {
    it("should throw NetworkResourceNotFoundException for a 404 response", async () => {
        const url = "http://localhost/bin/HTTP/not-found.php";
        const abortController = new AbortController;
        let resolved = false;
        try {
            await networkRequest(url, abortController, {
                throwStatusErrors: true,
            });
            resolved = true;
        } catch (error) {
            expect(error).to.be.instanceOf(NetworkResourceNotFoundException);
        }
        if (resolved) {
            throw new Error("Expected NetworkResourceNotFoundException, but none was thrown.");
        }
    });
});