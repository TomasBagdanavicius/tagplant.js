"use strict";

import { expect } from "chai";
import { networkRequest, uploadFile } from "../../../src/process/network-request.js";
import { userPaths } from "../../../var/paths.js";

describe("networkRequest", () => {
    it("should upload a single file", async () => {
        const url = `${userPaths.project}demo/material/images/1000x1000_Earth.jpg`;
        const uploadURL = `${userPaths.project}demo/api/upload.php`;
        const abortController = new AbortController;
        const file = await networkRequest(url, abortController, { asFile: true });
        expect(file).to.be.instanceOf(File);
        await uploadFile(uploadURL, file, new AbortController);
    });
});