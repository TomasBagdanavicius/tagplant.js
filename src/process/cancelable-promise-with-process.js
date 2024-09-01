"use strict";

import { CancelablePromise } from "../core/process/cancelable-promise.js";
import { Process } from "./process.js";

export class CancelablePromiseWithProcess extends CancelablePromise {
    #process;
    #processComplete;
    constructor(executor, handler, {
        processName,
        processTitle,
        timeout,
        handleSignal = true,
        processCategory = "regular",
        processComplete = true,
        processDetails,
        supportsProgress = false
    } = {}) {
        let process;
        let abortController;
        let ownProcess = true;
        if (handler instanceof Process) {
            process = handler;
            ownProcess = false;
        } else if (handler instanceof AbortController) {
            abortController = handler;
        }
        super((resolve, reject, abortController) => {
            if (!process) {
                process = new Process(processName, processTitle, {
                    handle: abortController,
                    timeout,
                    category: processCategory,
                    supportsProgress,
                    details: processDetails,
                });
            }
            if (process.isPending) {
                process.start();
            }
            executor(resolve, reject, process);
        }, abortController, handleSignal);
        this.processComplete = processComplete;
        this.#process = process;
        this.then(() => {
            if (this.#processComplete && ownProcess && process.isRunning) {
                process.complete();
            }
        }, error => {
            // Might have been aborted
            if (process.isRunning) {
                process.fail(error);
            }
        });
    }
    get process() {
        return this.#process;
    }
    set processComplete(value) {
        this.#processComplete = value;
    }
    get processComplete() {
        return this.#processComplete;
    }
    static get [Symbol.species]() {
        return Promise;
    }
}