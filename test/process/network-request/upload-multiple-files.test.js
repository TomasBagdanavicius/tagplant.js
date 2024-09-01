"use strict";

import { expect } from "chai";
import { networkRequest, uploadFiles } from "../../../src/process/network-request.js";
import { standardFilesListFromIterable } from "../../../src/core/network/functions.js";
import { userPaths } from "../../../var/paths.js";

describe("networkRequest", () => {
    it("should upload multiple files", async () => {
        const uploadURL = `${userPaths.project}demo/api/upload.php`;
        const url1 = `${userPaths.project}demo/material/images/1000x1000_Earth.jpg`;
        const url2 = `${userPaths.project}demo/material/images/2560x1600_Sunflower.jpg`;
        const files = await Promise.all([
            networkRequest(url1, new AbortController, { asFile: true }),
            networkRequest(url2, new AbortController, { asFile: true }),
        ]);
        expect(files).to.be.an("array").that.has.lengthOf(2);
        files.forEach(file => {
            expect(file).to.be.instanceOf(File);
        });
        await uploadFiles(uploadURL, standardFilesListFromIterable(files), new AbortController);
    });
});