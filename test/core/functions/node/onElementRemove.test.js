"use strict";

import { onElementRemove } from "../../../../src/core/functions/node.js";

before(() => {
    global.MutationObserver = window.MutationObserver;
});

describe("onElementRemove", () => {
    it("should resolve when the element is removed", done => {
        const element = document.createElement("div");
        document.body.append(element);
        let resolved = false;
        onElementRemove(element).then(() => {
            done();
        }).catch((err) => {
            done(err);
        }).finally(() => {
            resolved = true;
        });
        element.remove();
        setTimeout(() => {
            if (!resolved) {
                done(new Error("`onElementRemove` has not run"));
            }
        }, 0);
    });
});