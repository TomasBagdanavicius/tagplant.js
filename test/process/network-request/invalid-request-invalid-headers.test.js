"use strict";

import { expect } from "chai";
import { networkRequest } from "../../../src/process/network-request.js";
import { NetworkRequestException } from "../../../src/core/network/exceptions.js";

describe("networkRequest", () => {
    it("should throw NetworkRequestException for a bad request", async () => {
        const url = "http://localhost";
        const abortController = new AbortController;
        let resolved = false;
        try {
            await networkRequest(url, abortController, {
                requestOptions: {
                    headers: {
                        // These headers are invalid
                        'C ontent-Type': 'text/xml',
                        'Breaking-Bad': '<3',
                    }
                },
            });
            resolved = true;
        } catch (error) {
            expect(error).to.be.instanceOf(NetworkRequestException);
        }
        if (resolved) {
            throw new Error("Expected NetworkRequestException, but none was thrown.");
        }
    });
});