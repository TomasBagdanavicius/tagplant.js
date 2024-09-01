"use strict";

import { expect } from "chai";
import { networkRequest } from "../../../src/process/network-request.js";
import { Process } from "../../../src/process/process.js";

describe("networkRequest", () => {
    it("should return the correct multi-line text block for a POST request", async () => {
        const url = "http://localhost/bin/PHP/sleep.php?seconds=1";
        const abortController = new AbortController;
        const request = networkRequest(url, abortController, {
            processCategory: "myCategory",
        });
        expect(request.process).to.be.instanceOf(Process);
        expect(request.process.name).to.equal("networkrequest");
        expect(request.process.title).to.equal("Network Request");
        expect(request.process.category).to.equal("myCategory");
    });
});