"use strict";

import { OptionsMixin } from "../core/mixins/options.js";
import { Group } from "../element/group.js";

export class SimpleNotifications extends OptionsMixin({ parentConstructor: EventTarget }) {
    static #defaultOptions = {
        duration: 5_000,
    }
    constructor(options = {}) {
        super([], SimpleNotifications.#defaultOptions, options);
    }
    send(message, { duration } = {}) {
        this.dispatchEvent(new CustomEvent("send", {
            detail: {
                message,
                duration: duration || this.options.duration,
            }
        }));
    }
    toElementRepresentative() {
        const group = new Group({ classes: ["simple-notifications"] });
        this.addEventListener("send", e => {
            const { message, duration } = e.detail;
            const [, key] = group.prepend(message);
            setTimeout(() => {
                group.remove(key);
            }, duration);
        });
        return group;
    }
    toElement() {
        return this.toElementRepresentative().element;
    }
}