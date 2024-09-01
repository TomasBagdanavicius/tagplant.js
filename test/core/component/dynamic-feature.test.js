"use strict";

import { expect } from "chai";
import { DynamicFeature } from "../../../src/core/component/feature.js";

let interval;
after(() => {
    if (!interval._destroyed) {
        clearInterval(interval);
    }
});

describe("DynamicFeature", () => {
    it("", () => {
        const element = document.createElement("div");
        let counter = 0;
        const activate = () => {
            interval = setInterval(() => {
                counter++;
                element.innerText = counter;
            }, 50);
        }
        const deactivate = () => {
            clearInterval(interval);
        }
        activate();
        const dynamicFeature = new DynamicFeature(element, "counter", activate, deactivate, {
            startActive: true,
        });
        expect(dynamicFeature.isActive).to.be.true;
        dynamicFeature.deactivate();
        expect(interval._destroyed).to.be.true;
    });
});