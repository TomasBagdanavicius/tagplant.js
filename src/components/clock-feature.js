"use strict";

import { removeClasses } from "../core/functions/node.js";
import { adjacencyPositions } from "../core/functions/enumeration.js";
import { EventListenersController } from "../core/events/event-listeners-controller.js";
import { Menu } from "../element/menu.js";
import { CheckBoxElement } from "../element/form/checkbox-element.js";
import { Process } from "../process/process.js";
import { onConcurrentAction } from "../process/jobs.js";
import { Clock } from "./clock.js";
import { dateTimeFormats } from "../../var/date-time-formats.js";

export const clockFeature = (() => {
    let state;
    let format;
    let controller;
    const sampleDate = new Date(new Date().getFullYear(), 0, 15, 12, 30, 45);
    const visibilityControls = new Map;
    const defaultStoreController = {
        state: true,
        format: "Time24",
        async fetch(name) {
            return this[name];
        },
        async save(name, value) {
            this[name] = value;
            return value;
        }
    };
    Object.seal(defaultStoreController);
    const defaultLocalStorageStoreController = {
        getKeyByName(name) {
            switch (name) {
                case "state":
                    return "showClock";
                case "format":
                    return "clockFormat";
            }
        },
        async fetch(name) {
            const key = this.getKeyByName(name);
            const value = localStorage.getItem(key);
            if (name === "state") {
                switch (value) {
                    case null:
                        return null;
                    case "0":
                        return false;
                    default:
                        return true;
                }
            } else {
                return value;
            }
        },
        async save(name, value) {
            const key = this.getKeyByName(name);
            let valueToStore = value;
            if (name === "state") {
                valueToStore = Number(value);
            }
            localStorage.setItem(key, valueToStore);
            return value;
        }
    }
    const broadcasting = new BroadcastChannel("clockFeature");
    function setState(newState, { dispatchEvent = true, broadcast = true } = {}) {
        if (state !== newState) {
            const oldState = state;
            state = newState;
            if (dispatchEvent && controller) {
                controller.dispatchEvent(new CustomEvent("statechange", {
                    detail: { newState: state, oldState }
                }));
            }
            if (broadcast) {
                broadcasting.postMessage({
                    action: "state",
                    value: state
                });
            }
        }
    }
    function setFormat(newFormat, { dispatchEvent = true, broadcast = true } = {}) {
        if (format !== newFormat) {
            const oldFormat = format;
            format = newFormat;
            if (dispatchEvent && controller) {
                controller.dispatchEvent(new CustomEvent("formatchange", {
                    detail: { newFormat: format, oldFormat }
                }));
            }
            if (broadcast) {
                broadcasting.postMessage({
                    action: "format",
                    value: format
                });
            }
        }
    }
    let storeController = defaultStoreController;
    let hasCustomStoreController;
    controller = new class extends EventTarget {
        get state() {
            return state;
        }
        get format() {
            return format;
        }
        get hasCustomStoreController() {
            return hasCustomStoreController;
        }
        get defaultStoreController() {
            return defaultStoreController;
        }
        get defaultLocalStorageStoreController() {
            return defaultLocalStorageStoreController;
        }
        async getState({ signal } = {}) {
            let value = await storeController.fetch("state", { signal });
            // Value "false" is a qualified value
            if (value === null) {
                value = await storeController.save("state", storeController.state || defaultStoreController.state, { signal });
            }
            return value;
        }
        async getFormat({ signal } = {}) {
            let value = await storeController.fetch("format", { signal });
            if (value === null) {
                value = await storeController.save("format", storeController.format || defaultStoreController.format, { signal });
            }
            return value;
        }
        async setCustomStoreController(controller, { apply = false } = {}) {
            storeController = controller;
            hasCustomStoreController = true;
            if (apply) {
                await this.applyStoreController();
            }
        }
        async applyStoreController() {
            const [state, format] = await Promise.all([this.getState(), this.getFormat()]);
            setState(state);
            setFormat(format);
            return { state, format };
        }
        unsetCustomStoreController() {
            if (hasCustomStoreController) {
                storeController = defaultStoreController;
                hasCustomStoreController = false;
            }
        }
        async saveState(value, { force = false, signal } = {}) {
            const currentGoals = { state };
            const newGoals = { state: value };
            const callback = async signal => {
                await storeController.save("state", value, { signal });
            }
            const payload = {};
            const promise = onConcurrentAction("saveclockstate", newGoals, currentGoals, callback, {
                payload,
                force,
                signal
            });
            if (!payload.process) {
                const abortController = new AbortController;
                const process = Process.wrapAroundPromise(promise, [
                    "saveclockstate",
                    "Save Clock State",
                    { handle: abortController }
                ]);
                payload.process = process;
                this.dispatchEvent(new CustomEvent("savestatestart", {
                    detail: { state: value, process }
                }));
            }
            await promise;
            setState(value);
            return value;
        }
        async saveFormat(value, { force = true, signal } = {}) {
            const currentGoals = { format };
            const newGoals = { format: value };
            const callback = async signal => {
                await storeController.save("format", value, { signal });
            }
            const payload = {};
            const promise = onConcurrentAction("saveclockformat", newGoals, currentGoals, callback, {
                payload,
                force,
                signal
            });
            if (!payload.process) {
                const abortController = new AbortController;
                const process = Process.wrapAroundPromise(promise, [
                    "saveclockformat",
                    "Save Clock Format",
                    { handle: abortController }
                ]);
                payload.process = process;
                this.dispatchEvent(new CustomEvent("saveformatstart", {
                    detail: { format: value, process }
                }));
            }
            await promise;
            setFormat(value);
            return value;
        }
        releaseVisibilityControl({ name = "showclock", stylesheet, label = "Toggle Clock Visibility" } = {}) {
            const checkBoxElem = CheckBoxElement.createElement(name, {
                checked: state,
                stylesheet,
                label,
            });
            if (state === undefined) {
                checkBoxElem.undetermined = true;
            }
            const listeners = {
                change: {
                    type: "change",
                    args: [
                        e => {
                            const { newState } = e.detail;
                            if (newState !== state) {
                                this.saveState(newState, { force: false });
                            }
                        }
                    ]
                }
            };
            const controller = new EventListenersController(listeners, [checkBoxElem]);
            visibilityControls.set(checkBoxElem, controller);
            controller.add();
            this.addEventListener("savestatestart", e => {
                const { process } = e.detail;
                checkBoxElem.undetermined = true;
                process.delayedInfoToggler(checkBoxElem.button, {
                    adjacency: adjacencyPositions.afterbegin,
                    tag: "span"
                });
            });
            this.addEventListener("statechange", e => {
                const { newState } = e.detail;
                // Undetermined state will be removed along with this
                checkBoxElem.disabled = false;
                checkBoxElem.checked = newState;
            });
            return checkBoxElem;
        }
        removeVisibilityControl(element) {
            if (!visibilityControls.has(element)) {
                return false;
            }
            const controller = visibilityControls.get(element);
            controller.remove();
            return visibilityControls.delete(element);
        }
        formatWithSampleDate(format) {
            if (Object.hasOwn(dateTimeFormats, format)) {
                const { options, title } = dateTimeFormats[format];
                const formatter = new Intl.DateTimeFormat(document.documentElement.lang, options);
                let text = title;
                return text.concat(": ", formatter.format(sampleDate));
            }
        }
        releaseFormatMenu({ headingText, type, selectValue } = {}) {
            const menu = new Menu({ headingText, type, selectValue });
            for (const [name] of Object.entries(dateTimeFormats)) {
                const buttonText = this.formatWithSampleDate(name);
                const [listItem, , button] = menu.appendButton(buttonText, name);
                if (format === name) {
                    listItem.classList.add("active");
                    button.disabled = true;
                }
                button.addEventListener("click", () => {
                    this.saveFormat(name);
                });
            }
            const changeFormat = (newFormat, oldFormat) => {
                if (oldFormat) {
                    const oldFormatListItem = menu.list.getItem(oldFormat);
                    if (oldFormatListItem) {
                        removeClasses(oldFormatListItem, ["active"]);
                        menu.getButton(oldFormat).disabled = false;
                    }
                }
                const listItem = menu.list.getItem(newFormat);
                listItem.classList.add("active");
                menu.getButton(newFormat).disabled = true;
            }
            this.addEventListener("saveformatstart", e => {
                const { format, process } = e.detail;
                const button = menu.getButton(format);
                if (button) {
                    process.delayedInfoToggler(button, {
                        adjacency: adjacencyPositions.afterbegin,
                        tag: "span"
                    });
                }
            });
            this.addEventListener("formatchange", e => {
                const { newFormat, oldFormat } = e.detail;
                changeFormat(newFormat, oldFormat);
            });
            return menu;
        }
        releaseElement(attachmentController, { contentFormat = "text" } = {}) {
            let clockPiece;
            let clockElem;
            const enable = () => {
                if (!clockPiece) {
                    clockPiece = Clock.getPiece(dateTimeFormats[format]);
                    attachmentController.clockPiece = clockPiece;
                }
                clockPiece.start();
                if (!clockElem) {
                    clockElem = clockPiece.toElement({ format: contentFormat });
                }
                attachmentController.attach(clockElem);
            }
            if (state && format) {
                enable();
            }
            this.addEventListener("statechange", e => {
                const { newState } = e.detail;
                if (format) {
                    if (newState) {
                        enable();
                    } else if (clockPiece) {
                        clockPiece.stop();
                        attachmentController.remove();
                    }
                }
            });
            this.addEventListener("formatchange", e => {
                if (clockPiece) {
                    const { newFormat } = e.detail;
                    clockPiece.changeFormat(dateTimeFormats[newFormat]);
                } else if (state) {
                    enable();
                }
            });
        }
    }
    broadcasting.addEventListener("message", e => {
        const { action, value } = e.data;
        switch (action) {
            case "state":
                setState(value, { broadcast: false });
                break;
            case "format":
                setFormat(value, { broadcast: false });
        }
    });
    Object.freeze(controller);
    return controller;
})();