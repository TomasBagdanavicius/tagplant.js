"use strict";

import { promiseStates } from "../functions/enumeration.js";
import { ExpiredAbortError, ExplicitAbortError } from "../exceptions.js";

export class CancelablePromiseAbortException extends DOMException {
    constructor(message, previous) {
        super(message, "AbortError");
        this.previous = previous;
    }
}

export class CancelablePromise extends Promise {
    #state = promiseStates.pending;
    #abortController;
    constructor(executor, abortController, handleSignal = true) {
        if (abortController === undefined) {
            abortController = new AbortController;
        } else if (!(abortController instanceof AbortController)) {
            throw new TypeError("Parameter #2 is not an abort controller");
        }
        let isAbortControllerArchived = false;
        super((resolve, reject) => {
            executor(resolve, reject, abortController);
            abortController.signal.addEventListener("abort", () => {
                if (handleSignal && !isAbortControllerArchived) {
                    reject(new CancelablePromiseAbortException("Promise was aborted", abortController.signal.reason));
                }
            });
        });
        this.#abortController = abortController;
        // Using double callback instead of "finally" block, because the latter has shown to cause "uncaught in promise" errors.
        const onFinally = () => {
            // Archive/Mark as aborted
            if (!abortController.signal.aborted) {
                isAbortControllerArchived = true;
                abortController.abort(new ExpiredAbortError("The operation has expired"));
            }
        }
        this.then(() => {
            this.#state = promiseStates.fulfilled;
            onFinally();
        }, () => {
            this.#state = promiseStates.rejected;
            onFinally();
        });
    }
    static get [Symbol.species]() {
        return Promise;
    }
    get abortController() {
        return this.#abortController;
    }
    get state() {
        return this.#state;
    }
    cancel() {
        this.abortController.abort(new ExplicitAbortError("Aborted by application"));
    }
    static isPromiseAbortException(error) {
        return error instanceof CancelablePromiseAbortException;
    }
}