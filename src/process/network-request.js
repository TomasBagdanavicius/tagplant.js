"use strict";

import { httpMethods } from "../core/functions/enumeration.js";
import { consoleDebugColor, validateVarInterface } from "../core/functions/misc.js";
import { ExpiredAbortError, TimeoutException } from "../core/exceptions.js";
import { chunkCallbackResponse, progressCallback, parseResponseContent, responseToFile } from "../core/network/functions.js";
import { CancelablePromiseWithProcess } from "./cancelable-promise-with-process.js";
import { Process } from "./process.js";
import { NetworkAbortException, NetworkError, NetworkInvalidStatusException, NetworkRequestException, NetworkResourceDeniedException, NetworkResourceNotFoundException, NetworkResourceServerErrorException, NetworkTimeoutException } from "../core/network/exceptions.js";

export function networkRequest(url, handle, {
    method = httpMethods.get,
    timeout = 2_000,
    timeoutConnectOnly = true,
    requestOptions = {},
    returnResponse = false,
    throwStatusErrors = false,
    processCategory = "regular",
    asFile = false,
    trackDownloadProgress = true,
    handleSignal = false,
    body,
    headers,
} = {}) {
    validateVarInterface(handle, [AbortController, Process], { paramNumber: 2 });
    return new CancelablePromiseWithProcess(async (resolve, reject, process) => {
        const detailsPayload = {};
        window.dispatchEvent(new CustomEvent("beforenetworkrequest", {
            detail: { url, method, process, payload: detailsPayload }
        }));
        if (detailsPayload.url) {
            if (detailsPayload.url instanceof URL) {
                url = detailsPayload.url;
            } else {
                console.warn("Payload URL must be provided as URL instance");
            }
        }
        requestOptions.method = method.value;
        requestOptions.signal = process.signal;
        if (body) {
            requestOptions.body = body;
        }
        if (headers) {
            requestOptions.headers = headers;
        }
        const handleError = error => {
            if (error instanceof ExpiredAbortError) {
                // Do nothing - this abort implies expired procedure.
            } else if (error.name === "AbortError") {
                // DOMException: The operation was aborted.
                // DOMException: BodyStreamBuffer was aborted.
                // ExplicitAbortError
                reject(new NetworkAbortException(`Network request aborted: ${error.message}`, error));
            } else if (error.name === "TimeoutError") {
                // AbortSignal.timeout => DOMException: The operation timed out.
                // TimeoutException
                reject(new NetworkTimeoutException(`Network request has timed out: ${error.message}`));
            } else {
                reject(error);
            }
        }
        window.dispatchEvent(new CustomEvent("networkrequest", {
            detail: { url, method, process }
        }));
        // First off, will check whether the request is valid (see: https://developer.mozilla.org/en-US/docs/Web/API/fetch#exceptions applies to Request as well)
        try {
            consoleDebugColor(`📡 Network request: ${String(url)}`, "skyblue");
            const request = new Request(url, requestOptions);
            try {
                let response = await fetch(request);
                if (timeoutConnectOnly) {
                    process.stopTimeout();
                }
                try {
                    if (!returnResponse) {
                        if (throwStatusErrors) {
                            switch (response.status) {
                                case 404:
                                    reject(new NetworkResourceNotFoundException(`Network resource at ${url} was not found`));
                                    break;
                                case 401:
                                    reject(new NetworkResourceDeniedException("Network resource denied"));
                                    break;
                                case 500:
                                    reject(new NetworkResourceServerErrorException("Network resource responded with server error"));
                            }
                        }
                        if (response.ok) {
                            let payload;
                            let responseReadInfo;
                            if (trackDownloadProgress) {
                                responseReadInfo = {};
                                response = chunkCallbackResponse(response, progressCallback(progressNumber => {
                                    process.progress(progressNumber);
                                }), responseReadInfo, process.signal);
                            }
                            if (!asFile) {
                                payload = await parseResponseContent(response);
                            } else {
                                payload = await responseToFile(response);
                            }
                            if (responseReadInfo && Object.hasOwn(responseReadInfo, "error")) {
                                throw responseReadInfo.error;
                            }
                            resolve(payload);
                        } else {
                            reject(new NetworkInvalidStatusException(`Invalid network response status ${response.status}`));
                        }
                    } else {
                        resolve(response);
                    }
                } catch (error) {
                    handleError(error);
                }
            } catch (error) {
                // The assumption is that `Request` has consumed all request errors that are marked as `TypeError` and what remains is network errors.
                if (error.name === "TypeError") {
                    reject(new NetworkError(error.message));
                } else if (error instanceof TimeoutException || (error.name === "AbortError" && process.signal.aborted && process.signal.reason instanceof TimeoutException)) {
                    reject(new NetworkTimeoutException(`Network request has timed out: ${error.message}`));
                } else {
                    handleError(error);
                }
            }
        } catch (error) {
            reject(new NetworkRequestException(`Network request is invalid: ${error.message}`));
        }
    }, handle, {
        processName: "networkrequest",
        processTitle: "Network Request",
        timeout,
        handleSignal,
        processCategory,
        processDetails: String(url),
        supportsProgress: trackDownloadProgress
    });
}

export function uploadFiles(url, files, handle, timeout = 60_000) {
    const formData = new FormData;
    for (const data of files) {
        let fileName;
        if (data.fileName) {
            fileName = data.fileName;
        } else if (data.file instanceof File) {
            fileName = data.file.name;
        } else {
            fileName = "file";
        }
        // 2nd parameter "value" can be either string, Blob or File.
        formData.append(data.name || "file", data.file, fileName);
    }
    return networkRequest(url, handle, { method: httpMethods.post, requestOptions: { body: formData }, timeout });
}

export function uploadFile(url, file, handle, { fileName, name = "file", timeout = 60_000 } = {}) {
    const files = [{ file, fileName, name }];
    return uploadFiles(url, files, handle, timeout);
}