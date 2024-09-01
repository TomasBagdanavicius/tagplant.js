"use strict";

import { expect } from "chai";
import { networkRequest } from "../../../src/process/network-request.js";
import { NetworkResourceServerErrorException } from "../../../src/core/network/exceptions.js";

describe("networkRequest", () => {
    it("should throw NetworkError for an address that would not resolve", async () => {
        const url = "http://localhost/bin/HTTP/server-error.php";
        const abortController = new AbortController;
        let resolved = false;
        try {
            await networkRequest(url, abortController, {
                throwStatusErrors: true,
            });
            resolved = true;
        } catch (error) {
            expect(error).to.be.instanceOf(NetworkResourceServerErrorException);
        }
        if (resolved) {
            throw new Error("Expected NetworkResourceServerErrorException, but none was thrown.");
        }
    });
});