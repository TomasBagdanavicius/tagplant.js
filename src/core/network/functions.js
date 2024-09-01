"use strict";

import { path } from "../functions/path.js";

export function chunkCallbackResponse(response, callback, info = {}, signal) {
    if (!response.headers.has("content-length")) {
        return response;
    }
    const contentLength = Number(response.headers.get("content-length"));
    info.contentLength = contentLength;
    const reader = response.body.getReader();
    const stream = new ReadableStream({
        start(controller) {
            info.chunkCount = 0;
            info.done = false;
            info.aborted = false;
            function pump() {
                reader.read().then(result => {
                    const { done, value } = result;
                    info.done = done;
                    info.aborted = signal && signal.aborted;
                    if (done) {
                        controller.close();
                        return true;
                    }
                    info.chunkCount++;
                    callback(value, contentLength);
                    controller.enqueue(value);
                    pump();
                }).catch(error => {
                    /* Note: The ReadableStream API has its own error handling mechanism, and errors thrown inside the pump function may not be directly visible in the outer catch block outside the ReadableStream instance. */
                    // When reading is aborted (eg. via signal) Blink throws "DOMException: BodyStreamBuffer was aborted", whereas Gecko inherits error from outside. The below solution allows to have the real abort reason.
                    if (!info.aborted && signal?.aborted) {
                        info.error = signal.reason;
                    } else {
                        info.error = error;
                    }
                    // Will pretend that controller finished. This reduces console noise. Errors should be handled by inspecting the `info` payload.
                    controller.close();
                    return false;
                });
            }
            pump();
        }
    });
    const result = new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    });
    // Unfortunately, `Response` constructor does not count in "url" option. To make matters worse, it's a getter only param.
    result._url = response.url;
    return result;
}

export function progressCallback(callback) {
    let bytesRead = 0;
    return (value, contentLength) => {
        bytesRead += value.byteLength;
        const progressNumber = bytesRead / contentLength * 100;
        callback(progressNumber);
    }
}

export function parseResponseContent(response) {
    if (!(response instanceof Response)) {
        throw new TypeError("Parameter #1 is not a response interface");
    }
    let contentType;
    let type = "text";
    if (response.headers.has("content-type")) {
        contentType = response.headers.get("content-type").toLowerCase();
        if (contentType.startsWith("application/json")) {
            type = "json";
        } else if (contentType.startsWith("image/")) {
            type = "image";
        }
    }
    switch (type) {
        case "text":
            return response.text();
        case "json":
            return response.json();
        case "image":
            return response.blob();
    }
}

export function responseToFile(response, fileName) {
    if (!(response instanceof Response)) {
        throw new TypeError("Parameter #1 is not a response interface");
    }
    return new Promise((resolve, reject) => {
        response.blob()
            .then(blob => {
                const url = new URL(response.url || response._url);
                if (!fileName) {
                    fileName = path.basename(url.pathname);
                }
                const file = new File([blob], fileName, { type: blob.type });
                resolve(file);
            })
            .catch(error => {
                reject(error);
            });
    });
}

export function standardFilesListFromIterable(files) {
    const data = [];
    let index = 0;
    for (const file of files) {
        data.push({ file, name: `file${index}` });
        index++;
    }
    return data;
}

export function standardFilesListFromFileList(fileList) {
    if (!(fileList instanceof FileList)) {
        throw new TypeError("Parameter #1 must implement FileList interface");
    }
    return standardFilesListFromIterable(Array.from(fileList));
}