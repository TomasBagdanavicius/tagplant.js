"use strict";

export const OptionsMixin = ({ parentConstructor } = {}) => {
    const Mixin = class extends parentConstructor {
        static #defaultOptions;
        #userOptions;
        #options;
        constructor(args, defaultOptions, options) {
            super(...args);
            Mixin.#defaultOptions = defaultOptions;
            this.#userOptions = options;
            this.#options = { ...defaultOptions, ...options };
        }
        get options() {
            return Object.assign({}, this.#options);
        }
        get defaultOptions() {
            return Mixin.defaultOptions;
        }
        get userOptions() {
            return this.#userOptions;
        }
        static get defaultOptions() {
            return Object.assign({}, Mixin.#defaultOptions);
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