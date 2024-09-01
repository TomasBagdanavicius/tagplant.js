"use strict";

import { MyDate } from "../core/date-time/my-date.js";

const ports = new Set;
function postToPorts(message) {
    if (ports.size) {
        for (const port of ports) {
            port.postMessage(message);
        }
    }
}

let previousDateParts = new MyDate().toParts();

function tick() {
    setTimeout(() => {
        const payload = [];
        const date = new MyDate;
        date.setMilliseconds(0);
        payload.push(date);
        const parts = date.toParts();
        payload.push(parts);
        const changed = MyDate.compareParts(previousDateParts, parts, ["second", "millisecond"]);
        changed.push("second");
        payload.push(changed);
        postToPorts(payload);
        previousDateParts = parts;
        tick();
    }, 1000 - new Date().getMilliseconds());
}
tick();

function closePort(port) {
    console.debug("Shared worker: closing port");
    postToPorts("closingport");
    port.close();
    ports.delete(port);
    if (!ports.size) {
        closeWorker();
    }
}

function closeWorker() {
    console.debug("Shared worker: closing worker");
    postToPorts("closingworker");
    ports.clear();
    close();
}

addEventListener("connect", e => {
    console.debug("Shared worker: connected port");
    const [port] = e.ports;
    ports.add(port);
    port.start();
    port.addEventListener("message", e => {
        if (e.data === "closeport") {
            closePort(port);
        } else if (e.data === "closeworker") {
            closeWorker();
        }
    });
});