"use strict";

import { isNullish } from "../core/functions/misc.js";
import { validateImageDimensions } from "../core/functions/image.js";
import { sizeCropToAspectRatio, proportionalHeight, proportionalWidth } from "../core/geometry/functions.js";
import { workerInfo, workerScopeOnMessage, workerScopePostMessage } from "./utils.js";

function work() {
    workerScopeOnMessage(async data => {
        let [sourceImage, width, height, type, quality, resizeMethod = "useCanvas"] = data;
        if (isNullish(width) && isNullish(height)) {
            workerScopePostMessage(new TypeError("Both width and height cannot be nullish"));
            return false;
        }
        // Allows to determine image dimensions
        const image = await createImageBitmap(sourceImage);
        if (width === null) {
            width = proportionalWidth(image.width, image.height, height);
        } else if (height === null) {
            height = proportionalHeight(image.width, image.height, width);
        }
        try {
            validateImageDimensions(image, width, height);
        } catch (error) {
            workerScopePostMessage(error);
            return false;
        }
        if (image.width === width && image.height === height) {
            workerScopePostMessage(sourceImage);
        } else {
            const aspectRatio = width / height;
            const size = sizeCropToAspectRatio(image.width, image.height, aspectRatio);
            const [sourceWidth, sourceHeight] = size;
            const sourceX = (image.width - size[0]) / 2;
            const sourceY = (image.height - size[1]) / 2;
            const canvas = new OffscreenCanvas(width, height);
            const context = canvas.getContext("2d");
            /* Note: this method produces sharper images, but seems to be unstable in Firefox. */
            if (resizeMethod === "useCanvas") {
                context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
            } else {
                const resizedImage = await createImageBitmap(image, sourceX, sourceY, sourceWidth, sourceHeight, {
                    resizeWidth: width,
                    resizeHeight: height,
                    resizeQuality: "high"
                });
                context.drawImage(resizedImage, 0, 0);
            }
            const blob = await canvas.convertToBlob({ type, quality });
            workerScopePostMessage(blob);
        }
    });
}

if (typeof self === "object") {
    work();
} else if (typeof global === "object") {
    import("worker_threads").then(module => {
        const { parentPort } = module;
        workerInfo.parentPort = parentPort;
        work();
    }).catch(error => {
        console.error(error);
    });
}