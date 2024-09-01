"use strict";

import { expect } from "chai";
import { networkRequest } from "../../../src/process/network-request.js";

describe("networkRequest", () => {
    it("should fetch and return a File object when asFile option is true", async () => {
        const abortController = new AbortController();
        const url = "http://localhost/storage/sample-files/documents/pdf-sample.pdf";
        const content = await networkRequest(url, abortController, {
            asFile: true,
        });
        expect(content).to.be.instanceOf(File);
    });
});