"use strict";

export class EventController {
    #type;
    constructor(type) {
        this.#type = type;
    }
    get type() {
        return this.#type;
    }
    get eventType() {
        return this.#type;
    }
}