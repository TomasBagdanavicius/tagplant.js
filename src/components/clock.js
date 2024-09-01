"use strict";

import { arrayElementRemove } from "../core/functions/array.js";
import { createElement } from "../core/functions/node.js";
import { validateVarInterface } from "../core/functions/misc.js";
import { MyDate } from "../core/date-time/my-date.js";
import { DateTimeFormat } from "../core/date-time/date-time-format.js";
import { userPaths } from "../../var/paths.js";

export const Clock = (() => {
    let worker;
    const clients = new Map;
    function sendErrorToClients(error) {
        for (const [client] of clients) {
            if (Object.hasOwn(client, "onerror")) {
                client.onerror(error);
                client.disconnect();
            }
        }
    }
    function setupWorker() {
        worker = new SharedWorker(`${userPaths.workers}clock.js`, {
            type: "module",
            name: "Clock",
        });
        worker.port.onmessage = e => {
            if (e.data === "closingworker") {
                sendErrorToClients("Worker was closed");
            } else if (e.data === "closingport") {
                sendErrorToClients("Worker port was closed");
            } else {
                for (const [, callback] of clients) {
                    callback(...e.data);
                }
            }
        }
        worker.addEventListener("error", error => {
            sendErrorToClients(error);
        });
    }
    function connect(callback) {
        const client = {
            disconnect() {
                clients.delete(client);
                if (!clients.size) {
                    worker.port.postMessage("closeport");
                    worker = undefined;
                }
            }
        }
        clients.set(client, callback);
        if (!worker) {
            setupWorker();
        }
        return client;
    }
    const exposure = {
        onTime(expectedDate) {
            validateVarInterface(expectedDate, Date);
            if (expectedDate.getTime() < Date.now()) {
                throw new TypeError("Expected date must be a future date");
            }
            return new Promise((resolve, reject) => {
                const client = connect(date => {
                    if (date.getTime() === expectedDate.getTime()) {
                        resolve();
                        client.disconnect();
                    }
                });
                client.onerror = error => {
                    reject(error);
                }
            });
        },
        getPiece(config, { locale = "en-US" } = {}) {
            const manager = new class extends EventTarget {
                #client;
                #date;
                #format;
                constructor() {
                    super();
                    this.#date = new MyDate;
                    this.#format = new DateTimeFormat(config.options, { date: this.#date, locale });
                }
                start() {
                    if (this.#client) {
                        throw new DOMException("Cannot start a clock that is already running");
                    }
                    this.#date = new MyDate;
                    this.#format.buildParts(this.#date);
                    this.#dispatchChangeEvent(this.#date, this.#format);
                    this.#client = connect((date, parts, changed) => {
                        // Gets transferred as `Date` instead of the original `MyDate`
                        date = new MyDate(date);
                        this.#date = date;
                        if (changed && this.#format.hasAnyPart(changed)) {
                            const changedParts = {};
                            for (const name of changed) {
                                changedParts[name] = parts[name];
                            }
                            this.#format.changeCommonParts(changedParts, date);
                            this.#dispatchChangeEvent(date, this.#format);
                        }
                        this.#dispatchTickEvent(date, this.#format);
                    });
                }
                stop() {
                    if (!this.#client) {
                        throw new DOMException("Cannot stop a clock that has not started");
                    }
                    this.#client.disconnect();
                    this.#client = undefined;
                }
                changeLocale(newLocale) {
                    locale = newLocale;
                    this.#format.locale = newLocale;
                    this.#dispatchChangeEvent(this.#date, this.#format);
                }
                changeFormat(format) {
                    config = format;
                    this.#format = new DateTimeFormat(format.options, { date: this.#date, locale });
                    this.#dispatchChangeEvent(this.#date, this.#format);
                }
                toElement({ classes = [], format = "text", splitTimeParts = false } = {}) {
                    if (classes.includes("clock")) {
                        arrayElementRemove(classes, "clock");
                    }
                    classes.unshift("clock");
                    const elem = createElement("time", { classes, attrs: { "data-format": config.name } });
                    const updateTick = date => {
                        elem.setAttribute("datetime", date.toLocalISOString());
                    }
                    const update = date => {
                        switch (format) {
                            case "html":
                                elem.innerHTML = this.#format.toHTML({ splitTimeParts });
                                break;
                            case "fragment":
                                elem.replaceChildren(...this.#format.toDocumentFragment().children);
                                break;
                            default:
                                elem.textContent = this.#format.toString();
                        }
                        updateTick(date);
                    }
                    this.addEventListener("change", e => {
                        update(e.detail.date);
                    });
                    this.addEventListener("tick", e => {
                        updateTick(e.detail.date);
                    });
                    update(this.#date);
                    return elem;
                }
                #dispatchChangeEvent(date, format) {
                    this.dispatchEvent(new CustomEvent("change", { detail: { date, format} }));
                }
                #dispatchTickEvent(date, format) {
                    this.dispatchEvent(new CustomEvent("tick", { detail: { date, format } }));
                }
            }
            Object.freeze(manager);
            return manager;
        }
    }
    Object.freeze(exposure);
    return exposure;
})();