"use strict";

import { expect } from "chai";
import { networkRequest } from "../../../src/process/network-request.js";
import { NetworkError } from "../../../src/core/network/exceptions.js";

describe("networkRequest", () => {
    it("should throw NetworkError for an address that would not resolve", async () => {
        const url = "http://localhosts";
        const abortController = new AbortController;
        let resolved = false;
        try {
            await networkRequest(url, abortController, {
                timeout: 1000,
                requestOptions: {
                    mode: "no-cors"
                }
            });
            resolved = true;
        } catch (error) {
            expect(error).to.be.instanceOf(NetworkError);
        }
        if (resolved) {
            throw new Error("Expected NetworkError, but none was thrown.");
        }
    });
});