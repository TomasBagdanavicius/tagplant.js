"use strict";

import sinon from "sinon";
import { onConnectedChange } from "../../../../src/core/functions/node.js";

before(() => {
    global.MutationObserver = window.MutationObserver;
});

describe("onConnectedChange", () => {
    it(`should trigger "connected" event when element is appended to the document`, () => {
        const element = document.createElement("div");
        onConnectedChange(element);
        const addEventListenerSpy = sinon.spy();
        element.addEventListener("connected", addEventListenerSpy);
        document.body.append(element);
        setTimeout(() => {
            sinon.assert.calledOnce(addEventListenerSpy);
        }, 0);
    });
    it(`should trigger "connected" event when element is appended to the document`, () => {
        const element = document.createElement("div");
        onConnectedChange(element);
        const connectedAddEventListenerSpy = sinon.spy();
        element.addEventListener("connected", connectedAddEventListenerSpy);
        document.body.append(element);
        setTimeout(() => {
            sinon.assert.calledOnce(connectedAddEventListenerSpy);
        }, 0);
        const disconnectedAddEventListenerSpy = sinon.spy();
        element.addEventListener("disconnected", disconnectedAddEventListenerSpy);
        element.parentNode.removeChild(element);
        setTimeout(() => {
            sinon.assert.calledOnce(disconnectedAddEventListenerSpy);
        }, 0);
    });
});