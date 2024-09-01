"use strict";

import { EventController } from "../event-controller.js";
import { EventListenersController } from "../event-listeners-controller.js";

export class LongPressEventController extends EventController {
    static #eventType = "longpress";
    #target;
    #controller;
    constructor(elem, { length = 2_000, addImmediatelly = true } = {}) {
        super();
        this.#target = elem;
        this.#controller = new EventListenersController(this.getListeners(length), elem, {
            autoadd: addImmediatelly
        });
    }
    static get eventType() {
        return LongPressEventController.#eventType;
    }
    add() {
        this.#controller.add();
    }
    remove() {
        this.#controller.remove();
    }
    toggle() {
        this.#controller.toggle();
    }
    #dispatch(detail) {
        this.#target.dispatchEvent(new CustomEvent(LongPressEventController.#eventType, { detail }));
    }
    getListeners(duration) {
        let timeout;
        let mouseupPromiseResolver;
        return {
            mousedown: {
                type: "mousedown",
                args: [
                    e => {
                        const { promise, resolve } = Promise.withResolvers();
                        mouseupPromiseResolver = resolve;
                        timeout = setTimeout(() => {
                            this.#dispatch({ baseEvent: e, mouseupPromise: promise });
                        }, duration);
                    }
                ]
            },
            mouseup: {
                type: "mouseup",
                args: [
                    e => {
                        mouseupPromiseResolver(e);
                        clearTimeout(timeout);
                    }
                ]
            }
        };
    }
}