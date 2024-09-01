"use strict";

import { createElement } from "./node.js";
import { workerOnMessage } from "./misc.js";
import { userPaths } from "../../../var/paths.js";

/**
 * Resizes an image using a web worker.
 *
 * @param {Blob} image - An image source compatible with `createImageBitmap()`.
 * @param {number} width - The desired width of the resized image.
 * @param {number} height - The desired height of the resized image.
 * @param {string} type - The output image type (e.g., "image/jpeg", "image/png").
 * @param {number} quality - The quality of the output image (0 to 1).
 * @returns {Promise<Blob>} - A Promise that resolves with the resized image as a Blob.
 */
export function resizeImage(image, width, height, { type = "image/webp", quality = 1 } = {}) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(`${userPaths.workers}resize-image.js`, {
            type: "module",
            name: "Resize Image",
        });
        worker.postMessage([image, width, height, type, quality]);
        workerOnMessage(worker, data => {
            if (!(data instanceof Error)) {
                resolve(data);
            } else {
                reject(data);
            }
        });
        worker.addEventListener("error", () => {
            reject("There was an error with worker");
        });
        worker.addEventListener("messageerror", () => {
            reject("Error receiving message from worker");
        });
    });
}

/**
 * Loads an image from the provided URL.
 *
 * @param {string} url - The URL of the image to be loaded.
 * @returns {Promise<HTMLImageElement>} - A Promise that resolves with the loaded image as an HTMLImageElement.
 */
export function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image;
        image.onload = () => {
            resolve(image);
        };
        image.onerror = error => {
            reject(error);
        };
        image.src = url;
    });
}

/**
 * Creates an HTML image element with optional attributes.
 *
 * @param {string} url - The URL of the image.
 * @param {string} altText - The alt text for the image.
 * @param {number} width - The width of the image.
 * @param {number} height - The height of the image.
 * @returns {HTMLImageElement} - An HTMLImageElement representing the image.
 * @throws {TypeError} - If the provided width or height is not an integer.
 */
export function imageElementFromURL(url, altText, width, height) {
    if (width !== undefined && !Number.isInteger(width)) {
        throw new TypeError("Invalid width: it must be an integer");
    }
    if (height !== undefined && !Number.isInteger(height)) {
        throw new TypeError("Invalid height: it must be an integer");
    }
    const attrs = {
        src: url,
        ...(altText && { alt: altText }),
        ...(width && { width }),
        ...(height && { height })
    };
    return createElement("img", { attrs });
}

/**
 * Validates the dimensions of an image.
 *
 * @param {Image | ImageBitmap} image - The image to validate. Should be an instance of Image or ImageBitmap.
 * @param {number} width - The required minimum width of the image.
 * @param {number} height - The required minimum height of the image.
 * @throws {TypeError} If `image` is not an instance of Image or ImageBitmap.
 * @throws {RangeError} If the image dimensions do not meet the specified width or height requirements.
 */
export function validateImageDimensions(image, width, height) {
    /* Note: cannot use `validateVarInterface` here, because this function should be worker compatible and `Image` is not available in workers. */
    if (!(image instanceof ImageBitmap) && (typeof Image === "undefined" || !(image instanceof Image))) {
        throw new TypeError("Parameter #1 must implement either ImageBitmap or Image interface");
    }
    if (image.width < width) {
        throw new RangeError(`Image is not wide enough: required at least ${width}px, got ${image.width}px`);
    } else if (image.height < height) {
        throw new RangeError(`Image is not tall enough: required at least ${height}px, got ${image.height}px`);
    }
}