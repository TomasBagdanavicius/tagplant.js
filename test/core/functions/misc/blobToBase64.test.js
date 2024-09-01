"use strict";

import { expect } from "chai";
import { blobToBase64 } from "../../../../src/core/functions/misc.js";
import { userPaths } from "../../../../var/paths.js";

before(() => {
    global.FileReader = window.FileReader;
});

describe("blobToBase64", () => {
    it("should convert Blob to base64 string and include mimeType and base64Data", async () => {
        const url = `${userPaths.project}demo/material/images/150x150_Earth.jpg`;
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        expect(arrayBuffer).to.be.instanceOf(ArrayBuffer);
        const jsdomBlob = new window.Blob([arrayBuffer]);
        expect(jsdomBlob).to.be.instanceOf(window.Blob);
        const encodedData = await blobToBase64(jsdomBlob);
        expect(encodedData).to.have.property("mimeType");
        expect(encodedData).to.have.property("base64Data");
        expect(encodedData.mimeType).to.be.a("string").that.is.not.empty;
        expect(encodedData.base64Data).to.be.a("string").that.is.not.empty;
    });
});