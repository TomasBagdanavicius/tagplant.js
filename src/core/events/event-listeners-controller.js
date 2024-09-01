"use strict";

export class EventListenersController {
    #data;
    #targets;
    #isAdded = false;
    constructor(data, targets, { autoadd = false } = {}) {
        this.#data = data;
        this.#targets = Array.isArray(targets) ? targets : [targets];
        if (autoadd) {
            this.add();
        }
    }
    get isAdded() {
        return this.#isAdded;
    }
    add() {
        if (!this.#isAdded) {
            this.#add();
        }
    }
    remove() {
        if (this.#isAdded) {
            this.#remove();
        }
    }
    toggle() {
        if (this.#isAdded) {
            this.#remove();
        } else {
            this.#add();
        }
    }
    #add() {
        for (const { type, args } of Object.values(this.#data)) {
            for (const target of this.#targets) {
                target.addEventListener(type, ...args);
            }
        }
        this.#isAdded = true;
    }
    #remove() {
        for (const { type, args } of Object.values(this.#data)) {
            for (const target of this.#targets) {
                target.removeEventListener(type, ...args);
            }
        }
        this.#isAdded = false;
    }
}