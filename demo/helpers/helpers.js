"use strict";

import { createElement } from "../../src/core/functions/node.js";
import { sleep } from "../../src/core/functions/misc.js";
import { setCSSProperties } from "../../src/core/functions/style.js";
import { CancelablePromiseWithProcess } from "../../src/process/cancelable-promise-with-process.js";
import { Process } from "../../src/process/process.js";

export const starSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path d="M512 77.488l137.472 285.088L962.08 409.04 735.664 634.88l7.616 45.311 45.28 270.16-276.607-148.784L235.36 950.415l45.295-270.224 7.584-45.311L61.904 409.008l312.592-46.464L395.04 320zm-.017-61.936c-28.656 0-54.784 16.176-66.977 41.456l-115.904 240.64-266.704 39.664c-27.391 4.096-50.143 22.8-58.975 48.384-8.817 25.664-2.145 53.904 17.199 73.152l195.408 195.2-45.328 270.656c-4.56 27.28 7.232 54.624 30.368 70.576 12.72 8.737 27.664 13.153 42.624 13.153 12.32 0 24.64-2.992 35.793-8.977l232.496-125.184 232.512 125.184a75.853 75.853 0 0 0 35.776 8.977c14.96 0 29.905-4.416 42.657-13.153 23.103-15.952 34.91-43.295 30.319-70.576l-45.344-270.656 195.504-195.2c19.344-19.248 25.968-47.504 17.152-73.152-8.848-25.616-31.6-44.32-58.976-48.385l-266.656-39.664-115.968-240.64c-12.112-25.311-38.256-41.455-66.976-41.455z"/></svg>';

export class AssertError extends Error {
    constructor(message, cause) {
        super(message, { cause });
    }
}

export function log(...args) {
    console.log(...args);
}

export function logro(object) {
    console.log(Object.assign({}, object));
}

export function demoAction(delay = 2_000) {
    return new CancelablePromiseWithProcess(resolve => {
        setTimeout(() => {
            resolve("OK");
        }, delay);
    });
}

export function demoProcess({ length = 100000, category = "regular" } = {}) {
    const abortController = new AbortController;
    const process = new Process("hello-world", "Hello World!", {
        handle: abortController,
        supportsProgress: true,
        category
    });
    process.start();
    let timeout;
    let interval;
    timeout = setTimeout(() => {
        process.complete();
        clearInterval(interval);
    }, length);
    let i = 1;
    interval = setInterval(() => {
        process.progress(i);
        i++;
    }, length / 100);
    abortController.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        clearInterval(interval);
    });
    return process;
}

export function debugStack() {
    console.warn(new Error("Debugging stack...").stack);
}

export function buildStandardRectangleElement({ width = 250, height = 250, color = "gray" } = {}) {
    const elem = createElement("div");
    setCSSProperties(elem, {
        width: `${width}px`,
        height: `${height}px`,
        "background-color": color,
    });
    document.body.append(elem);
    return elem;
}

export const simpleDemoTask = [
    {
        perform: async (values, signal) => {
            await sleep(2000);
            //throw new Error("Error in perform");
            signal?.throwIfAborted();
            document.body.append(createElement("div", { text: "Hello World!", id: "el1" }));
            return "simple-task-result";
        },
        revert: async (values, value) => {
            await sleep(2000);
            document.getElementById("el1").remove();
        },
    }
];

export const demoTasks = [
    {
        perform: async (values, signal) => {
            console.log(values);
            await sleep(1000);
            signal?.throwIfAborted();
            //throw new Error("Error in perform");
            document.body.style.setProperty("outline", "solid 5px orange");
            return "outline";
        },
        revert: async (values, value) => {
            console.log(values, value);
            await sleep(2000);
            document.body.style.removeProperty("outline");
        },
    }, {
        perform: async (values, signal) => {
            console.log(values);
            await sleep(2000);
            signal?.throwIfAborted();
            //throw new Error("Error in perform");
            document.body.style.setProperty("background-color", "darkslateblue");
            return "background-color";
        },
        revert: async (values, value) => {
            console.log(values, value);
            await sleep(3_000);
            //throw new Error("Error in revert");
            document.body.style.removeProperty("background-color");
            return;
        },
        /* revert: (values, value) => {
            document.body.style.removeProperty("background-color");
        } */
    },
    (values, signal) => {
        console.log(values);
        return sleep(1000);
    }
];

export const demoTasksQuick = [
    {
        perform: async (values, signal) => {
            await sleep(10);
            signal?.throwIfAborted();
            // throw new Error("Error in perform");
            document.body.style.setProperty("outline", "solid 5px orange");
            return "outline";
        },
        revert: async (values, value) => {
            await sleep(2000);
            document.body.style.removeProperty("outline");
        },
    }, {
        perform: async (values, signal) => {
            await sleep(20);
            signal?.throwIfAborted();
            //throw new Error("Error in perform");
            document.body.style.setProperty("background-color", "darkslateblue");
            return "background-color";
        },
        revert: async (values, value) => {
            await sleep(3_000);
            //throw new Error("Error in revert");
            document.body.style.removeProperty("background-color");
            return;
        },
        /* revert: (values, value) => {
            document.body.style.removeProperty("background-color");
        } */
    },
    (values, signal) => {
        return sleep(10);
    }
];

export function repaintStarSVGToWhite() {
    const parser = new DOMParser;
    const svgDoc = parser.parseFromString(starSVG, "image/svg+xml");
    const pathElement = svgDoc.querySelector("path");
    pathElement.setAttribute("fill", "#fff");
    return new XMLSerializer().serializeToString(svgDoc);
}