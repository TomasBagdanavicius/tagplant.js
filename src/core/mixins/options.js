"use strict";

import { isIterable } from "../functions/misc.js";

export const OptionsMixin = ({ parentConstructor = Object } = {}) => {
    const Mixin = class extends parentConstructor {
        static #defaultOptions;
        #userOptions;
        #options;
        constructor(args, defaultOptions, options) {
            super(...(isIterable(args) ? args : []));
            Mixin.#defaultOptions = defaultOptions;
            this.#userOptions = options;
            this.#options = { ...defaultOptions, ...options };
        }
        get options() {
            return { ...this.#options };
        }
        get defaultOptions() {
            return Mixin.defaultOptions;
        }
        get userOptions() {
            return this.#userOptions;
        }
        static get defaultOptions() {
            return { ...Mixin.#defaultOptions };
        }
        getOption(name) {
            return this.#options[name];
        }
        hasOption(name) {
            return Object.hasOwn(this.#options, name);
        }
    }
    return Mixin;
}