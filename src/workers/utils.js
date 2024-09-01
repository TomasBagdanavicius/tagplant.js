"use strict";

export const workerInfo = {};

export function workerScopeOnMessage(callback) {
    if (!workerInfo.parentPort) {
        self.addEventListener("message", e => {
            callback(e.data);
        });
    } else {
        workerInfo.parentPort.on("message", data => {
            callback(data);
        });
    }
}

export function workerScopePostMessage(message) {
    if (!workerInfo.parentPort) {
        self.postMessage(message);
    } else {
        workerInfo.parentPort.postMessage(message);
    }
}