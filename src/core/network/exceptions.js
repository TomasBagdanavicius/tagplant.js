"use strict";

import { DOMExceptionWithCause, TimeoutException } from "../exceptions.js";

export class NetworkError extends DOMException {
    constructor(message) {
        super(message, "NetworkError");
    }
}

export class NetworkRequestException extends DOMException {
    constructor(message) {
        super(message, "RequestError");
    }
}

export class NetworkResourceNotFoundException extends DOMException {
    constructor(message) {
        super(message, "NetworkError");
    }
}

export class NetworkResourceDeniedException extends DOMException {
    constructor(message) {
        super(message, "NetworkError");
    }
}

export class NetworkResourceServerErrorException extends DOMException {
    constructor(message) {
        super(message, "NetworkError");
    }
}

export class NetworkAbortException extends DOMExceptionWithCause {
    constructor(message, cause) {
        super(message, "AbortError", cause);
    }
}

export class NetworkTimeoutException extends TimeoutException {
    constructor(message, cause) {
        super(message, cause);
    }
}

export class NetworkInvalidStatusException extends TimeoutException {
    constructor(message) {
        super(message);
    }
}