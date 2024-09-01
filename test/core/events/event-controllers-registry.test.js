"use strict";

import { expect } from "chai";
import sinon from "sinon";
import { createElement } from "../../../src/core/functions/node.js";
import { eventControllersRegistry } from "../../../src/core/events/event-controllers-registry.js";
import { LongPressEventController } from "../../../src/core/events/types/long-press-event-controller.js";

describe("eventControllersRegistry", () => {
    before(() => {
        eventControllersRegistry.register(LongPressEventController);
    });
    it("should register LongPressEventController", () => {
        expect(eventControllersRegistry.has(LongPressEventController.eventType)).to.be.true;
    });
    it("should call addEventListener when long-press event is dispatched", () => {
        const testElem = createElement("div");
        eventControllersRegistry.enable(LongPressEventController.eventType, testElem);
        const addEventListenerSpy = sinon.spy();
        testElem.addEventListener(LongPressEventController.eventType, addEventListenerSpy);
        testElem.dispatchEvent(new Event(LongPressEventController.eventType));
        sinon.assert.calledOnce(addEventListenerSpy);
      });
});