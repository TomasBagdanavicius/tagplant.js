"use strict";

export class DOMExceptionWithCause extends DOMException {
    #cause;
    constructor(message, name, cause) {
        super(message, name);
        this.#cause = cause;
    }
    get cause() {
        return this.#cause;
    }
}

export class TimeoutException extends DOMExceptionWithCause {
    constructor(message, cause) {
        super(message, "TimeoutError", cause);
    }
}

// Request has expired, eg. closed, declined, etc. There is a built-in "AbortError" DOMException, and "ExpiredAbortError" intends to build on top of it.
export class ExpiredAbortError extends DOMException {
    constructor(message) {
        super(message, "AbortError");
    }
}

// Abort was used explicity by application, eg. informs that the user chose to abort
export class ExplicitAbortError extends DOMException {
    constructor(message) {
        super(message, "AbortError");
    }
}

export class PromiseSeriesAbortException extends DOMException {
    constructor(message) {
        super(message, "AbortError");
    }
}

export class TaskPerformApplicationException extends DOMExceptionWithCause {
    constructor(message, cause) {
        super(message, "ApplicationException", cause);
    }
}

export class TaskRevertApplicationException extends DOMExceptionWithCause {
    constructor(message, cause) {
        super(message, "ApplicationException", cause);
    }
}