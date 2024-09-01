"use strict";

import sinon from "sinon";
import { writeTextToClipboard } from "../../../../src/core/functions/misc.js";

describe("writeTextToClipboard function", () => {
    let clipboardWriteTextStub;
    let clipboardReadTextStub;
    let clipboarText = "Hello World!";
    before(() => {
        // Ensure the clipboard object exists on navigator
        if (!navigator.clipboard) {
            navigator.clipboard = {};
        }
        // Define the writeText and readText methods if they don't exist
        if (!navigator.clipboard.writeText) {
            navigator.clipboard.writeText = async () => {};
        }
        if (!navigator.clipboard.readText) {
            navigator.clipboard.readText = async () => clipboarText;
        }
    });
    beforeEach(() => {
        // Mock the clipboard.writeText and clipboard.readText methods
        clipboardWriteTextStub = sinon.stub(navigator.clipboard, "writeText").resolves();
        clipboardReadTextStub = sinon.stub(navigator.clipboard, "readText").resolves(clipboarText);
    });
    afterEach(() => {
        // Restore the original methods
        clipboardWriteTextStub.restore();
        clipboardReadTextStub.restore();
    });
    it("should write text to clipboard and emit copytoclipboard event", () => {
        const addEventListenerSpy = sinon.spy();
        document.addEventListener("copytoclipboard", addEventListenerSpy);
        writeTextToClipboard(clipboarText);
        setTimeout(() => {
            sinon.assert.calledOnce(addEventListenerSpy);
        }, 0);
    });
});