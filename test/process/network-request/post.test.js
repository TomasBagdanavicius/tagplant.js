"use strict";

import { expect } from "chai";
import { networkRequest } from "../../../src/process/network-request.js";
import { httpMethods } from "../../../src/core/functions/enumeration.js";

describe("networkRequest", () => {
    it("should return the correct multi-line text block for a POST request", async () => {
        const url = "http://localhost/toolkit/request.php";
        const body = new FormData;
        body.append("foo", "bar");
        const abortController = new AbortController;
        const responseText = await networkRequest(url, abortController, {
            method: httpMethods.post,
            requestOptions: {
                body,
            },
        });
        const expectedText = `HTTP Request Method: POST\n\n\nPOST\nArray\n(\n    [foo] => bar\n)\n`;
        expect(responseText).to.equal(expectedText);
    });
});