"use strict";

/**
 * Adds an event listener to multiple target elements.
 *
 * @param {Array} targets - The array of target elements to attach the event listener to.
 * @param {string} type - The type of event to listen for, e.g., 'click', 'change'.
 * @param {EventListener} listener - The callback function that receives the event object when the event occurs.
 * @param {boolean|AddEventListenerOptions} [options=[]] - Optional. An options object that specifies characteristics about the event listener.
 */
export function addEventListeners(targets, type, listener, options = []) {
    for (const target of targets) {
        target.addEventListener(type, listener, ...options);
    }
}

/**
 * Add distinct event listeners to an element.
 *
 * @param {HTMLElement} target - The HTML element to which event listeners will be added.
 * @param {Object.<string, Function | Array>} listeners - An object mapping event types to functions or arrays of functions.
 */
export function addDistinctEventListeners(target, listeners) {
    for (const [type, element] of Object.entries(listeners)) {
        let args;
        if (typeof element === "function") {
            args = [element];
        } else {
            args = element;
        }
        target.addEventListener(type, ...args);
    }
}