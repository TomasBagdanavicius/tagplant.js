"use strict";

export const Component = (() => {
    let componentId = 0;
    return class extends EventTarget {
        #id;
        #content;
        #name;
        constructor(content, { name } = {}) {
            super();
            componentId++;
            this.#id = componentId;
            this.#content = content;
            if (!name) {
                name = `component-${componentId}`
            }
            this.#name = name;
        }
        get id() {
            return this.#id;
        }
        get content() {
            return this.#content;
        }
        get name() {
            return this.#name;
        }
    }
})();