"use strict";

import { expect } from "chai";
import { networkRequest } from "../../../src/process/network-request.js";

describe("networkRequest", () => {
    it("should fetch and return content from the provided URL", async () => {
        const url = "http://localhost/storage/sample-files/texts/short.txt";
        const abortController = new AbortController;
        const content = await networkRequest(url, abortController);
        expect(content).to.equal("Lorem ipsum dolor sit amet, consectetur adipiscing elit.");
    });
});