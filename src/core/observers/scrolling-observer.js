"use strict";

import { removeClasses } from "../functions/node.js";
import { validateVarInterface } from "../functions/misc.js";
import { EventListenersController } from "../events/event-listeners-controller.js";

export class ScrollingObserver {
    static #defaultOptions = {
        className: "scrolled"
    }
    #options;
    #targets = new Map;
    constructor(options = {}) {
        this.#options = { ...ScrollingObserver.#defaultOptions, ...options };
    }
    static get defaultOptions() {
        return Object.assign({}, this.#defaultOptions);
    }
    observe(target, delegates) {
        validateVarInterface(target, Element);
        let scrollTimeout;
        const evaluateScrollTop = () => {
            if (target.scrollTop !== 0) {
                target.classList.add(this.#options.className);
                for (const delegate of delegates) {
                    delegate.classList.add(this.#options.className);
                }
            } else {
                removeClasses(target, [this.#options.className]);
                for (const delegate of delegates) {
                    removeClasses(delegate, [this.#options.className]);
                }
            }
        }
        const listeners = {
            scroll: {
                type: "scroll",
                args: [
                    () => {
                        clearTimeout(scrollTimeout);
                        evaluateScrollTop();
                        scrollTimeout = setTimeout(() => {
                            evaluateScrollTop();
                        }, 100);
                    }
                ]
            }
        }
        const eventListeners = new EventListenersController(listeners, target, {
            autoadd: true
        });
        this.#targets.set(target, { eventListeners, scrollTimeout });
    }
    unobserve(target) {
        if (this.#targets.has(target)) {
            const { eventListeners, scrollTimeout } = this.#targets.get(target);
            eventListeners.remove();
            clearTimeout(scrollTimeout);
            this.#targets.delete(target);
        }
    }
}