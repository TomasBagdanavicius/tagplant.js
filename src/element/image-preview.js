"use strict";

import { createElement, createSimpleButton, bindFileInputChangeAndReplace, removeClasses } from "../core/functions/node.js";
import { addDistinctEventListeners } from "../core/events/functions.js";
import { imageElementFromURL, resizeImage, validateImageDimensions } from "../core/functions/image.js";
import { validateVarInterface } from "../core/functions/misc.js";
import { adjacencyPositions, enumList, promiseStates, validateEnumMember } from "../core/functions/enumeration.js";
import { CancelablePromise } from "../core/process/cancelable-promise.js";
import { ElementRepresentative } from "../core/element/element-representative.js";
import { NetworkAbortException } from "../core/network/exceptions.js";
import { networkRequest, uploadFile } from "../process/network-request.js";
import { CancelablePromiseWithProcess } from "../process/cancelable-promise-with-process.js";
import { Menu } from "./menu.js";
import { Process } from "../process/process.js";
import { Jobs, globalJobs } from "../process/jobs.js";
import { notificationsCenter } from "../components/site-notifications.js";
import { globalAreas } from "../core/process/area.js";

export class ImagePreview extends ElementRepresentative {
    #options;
    #el;
    #image;
    #menu;
    #isSetting = false;
    static #backgroundMethods = enumList({
        style: "style",
        image: "image",
    }, "backgroundMethods");
    constructor(options = {}) {
        const allOptions = { ...ImagePreview.defaultOptions, ...options };
        const [container] = ImagePreview.createContainer(
            allOptions.acceptedTypes.join(","),
            false
        );
        super(container);
        this.#options = allOptions;
        this.#el = container;
        const menu = new Menu({ type: Menu.types.regular, host: this.#el });
        this.#menu = menu;
        let fileInputButton;
        if (typeof self.showOpenFilePicker === "function") {
            fileInputButton = this.#createUploadButton();
        } else {
            const fileInputSchema = this.constructor.getFileInputSchema(this.#options.acceptedTypes);
            fileInputButton = createElement(...Object.values(fileInputSchema));
            const bindFileInputButton = button => {
                let process;
                button.addEventListener("click", () => {
                    const area = globalAreas.relative(button);
                    const abortController = area.provideAbortController();
                    process = new Process("imageupload", "Image Upload", { handle: abortController });
                    process.start();
                    process.delayedInfoToggler(button, { tag: "span", adjacency: adjacencyPositions.beforebegin });
                });
                button.addEventListener("cancel", () => {
                    process.abort();
                });
                button.addEventListener("change", () => {
                    process.complete();
                });
            }
            bindFileInputButton(fileInputButton);
            bindFileInputChangeAndReplace(fileInputButton, (e, newInput) => {
                this.processFile(e.target.files.item(0), true);
                bindFileInputButton(newInput);
            });
        }
        menu.append(fileInputButton, "fileInput");
        menu.append(this.#createRemoveButton(), "removeButton");
        menu.list.detachItem("removeButton");
        this.#el.append(menu.element);
        addDistinctEventListeners(this.#el, {
            // Required for "drop" event to work
            "dragover": e => {
                e.preventDefault();
                this.#el.classList.add("dragover");
            },
            "dragleave": () => {
                removeClasses(this.#el, ["dragover"]);
            },
            "drop": e => {
                e.preventDefault();
                removeClasses(this.#el, ["dragover"]);
                this.processFile(e.dataTransfer.files.item(0), true);
            },
        });
    }
    static get defaultOptions() {
        return {
            acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
            // Acts as middleware between file and setting the image.
            onFile: undefined,
            onBeforeUnset: undefined,
            onUnset: undefined,
            imagePlacement: ImagePreview.backgroundMethods.style,
            onConnected: undefined
        };
    }
    get options() {
        return this.#options;
    }
    get isSetting() {
        return this.#isSetting;
    }
    static get backgroundMethods() {
        return ImagePreview.#backgroundMethods;
    }
    get hasImage() {
        return this.#image !== undefined;
    }
    validateType(mimeType) {
        if (!this.#options.acceptedTypes.includes(mimeType)) {
            throw new DOMException(`Mime type "${mimeType}" is not supported`);
        }
    }
    processFile(file, interactive = false) {
        // For clarity/simplicity this must be a file. "dataTransfer" mechanism provides files. Also, allows access to file name.
        validateVarInterface(file, File);
        if (!this.#options.onFile) {
            this.setImage(file, file.name, { interactive });
        } else {
            this.#options.onFile(file, this, interactive);
        }
    }
    get setImageJobs() {
        return globalJobs.filter("imagePreview", "setImage", false);
    }
    getSetImageTasks(image, imageText, handle, attachProcess) {
        return [
            async () => {
                this.dispatchEvent(new CustomEvent("setimage", { detail: { image } }));
                return await ImagePreview.imageToElement(this.#el, image, imageText, handle, {
                    method: this.#options.imagePlacement,
                    attachProcess
                });
            },
            () => {
                this.#image = image;
                this.#menu.list.reattachItem("removeButton");
            }
        ];
    }
    async setImage(image, imageText, { handle, attachProcess = true, interactive = false } = {}) {
        validateVarInterface(image, [Blob, File, ImageBitmap, Image]);
        if (image instanceof Blob || image instanceof File) {
            try {
                this.validateType(image.type);
            } catch (error) {
                notificationsCenter.sendParams("Incorrect file format", { type: "error" });
                throw error;
            }
        }
        this.#isSetting = true;
        try {
            await Jobs.cancel(this.setImageJobs);
            const job = globalJobs.create("setImage", this.getSetImageTasks(image, imageText, handle, attachProcess), {
                category: "imagePreview",
                host: this
            });
            let abortController;
            if (handle) {
                abortController = handle instanceof AbortController ? handle : handle.abortController;
            }
            const [result] = await job.do({ abortController });
            return result;
        } catch (error) {
            let msg;
            if (error.name === "AbortError") {
                if (interactive) {
                    msg = "Image preview was aborted";
                }
            } else {
                msg = error.message || error;
            }
            if (msg) {
                notificationsCenter.sendParams(msg, { type: "error" });
            }
            throw error;
        } finally {
            this.#isSetting = false;
        }
    }
    #createUploadButton() {
        const uploadButton = createSimpleButton("Upload", ["upload-button"]);
        uploadButton.addEventListener("click", async () => {
            const imageTypes = {
                description: "Image",
                accept: {}
            };
            this.constructor.transformMimeArrayToObjectElement(this.#options.acceptedTypes, imageTypes.accept);
            const tasks = [
                () => self.showOpenFilePicker({
                    types: [imageTypes],
                    excludeAcceptAllOption: true,
                    multiple: false,
                }),
                values => {
                    const [fileSystemFileHandles] = values;
                    if (fileSystemFileHandles) {
                        const [fileHandle] = fileSystemFileHandles;
                        return fileHandle.getFile();
                    }
                }
            ];
            const area = globalAreas.relative(uploadButton);
            const [process, promise] = Process.wrapAroundPromiseSeries(tasks, ["imageupload", "Image Upload", area.provideAbortController()]);
            promise.then(values => {
                const [, file] = values;
                this.processFile(file, true);
            }).catch(error => {
                if (error.name === "AbortError") {
                    // Canceled by user (eg. by pressing the "Cancel" button in the file picker dialog window). Will not print into console, to reduce noise.
                }
            });
            process.delayedInfoToggler(uploadButton, { tag: "span", adjacency: adjacencyPositions.afterbegin });
        });
        return uploadButton;
    }
    #createRemoveButton() {
        const removeButton = createSimpleButton("Remove", ["remove-button"]);
        removeButton.addEventListener("click", async () => {
            let promise, process;
            if (this.#options.onBeforeUnset) {
                const result = this.#options.onBeforeUnset();
                if (result instanceof Promise) {
                    promise = result;
                } else {
                    ([promise, process] = result);
                }
            }
            if (!process) {
                const abortController = globalAreas.relative(removeButton).provideAbortController();
                process = new Process("removeimage", "Remove Image", { handle: abortController });
            }
            process.attachToElement(removeButton);
            process.delayedInfoToggler(removeButton, { tag: "span", adjacency: adjacencyPositions.afterbegin });
            process.start();
            try {
                if (promise) {
                    await promise;
                }
                this.unsetImage(false);
                if (this.#options.onUnset) {
                    await this.#options.onUnset();
                }
                process.complete();
            } catch (error) {
                process.failIfRunning(error);
            }
        });
        return removeButton;
    }
    unsetImage(runCallback = true) {
        if (this.#isSetting) {
            throw new DOMException("Cannot unset image when it's being set");
        }
        if (this.#image) {
            if (this.#options.imagePlacement === ImagePreview.#backgroundMethods.style) {
                this.#el.style.setProperty("background-image", "");
            } else {
                this.#el.querySelector(":scope > img").remove();
            }
            this.#image = undefined;
            this.#menu.list.detachItem("removeButton");
            if (runCallback && this.#options.onUnset) {
                this.#options.onUnset();
            }
        }
    }
    getElement() {
        return this.#el;
    }
    static getFileInputSchema(accept) {
        return {
            tag: "input",
            options: {
                attrs: {
                    type: "file",
                    name: "background",
                    accept
                }
            },
            ref: "fileInput"
        }
    }
    static createContainer(accept, addFileInput = true, refs = {}) {
        const elems = [];
        if (addFileInput) {
            elems.push(ImagePreview.getFileInputSchema(accept));
        }
        const container = createElement("div", { classes: ["image-preview"], elems }, refs);
        return [container, refs];
    }
    static setBackground(el, url, { method = ImagePreview.backgroundMethods.style, imageText = "" } = {}) {
        validateEnumMember(method, "backgroundMethods");
        if (method === ImagePreview.backgroundMethods.style) {
            el.style.setProperty("background-image", `url("${url}")`);
        } else {
            const imageEl = imageElementFromURL(url, imageText);
            el.append(imageEl);
        }
    }
    static imageToElement(el, image, imageText, handle, {
        method = ImagePreview.backgroundMethods.style,
        attachProcess = true,
        type = "image/webp",
        quality = 1,
        highRes = true
    } = {}) {
        const cancelablePromise = new CancelablePromiseWithProcess(async (resolve, reject, process) => {
            if (!el.isConnected) {
                reject(new DOMException("Element must be connected"));
            }
            let width, height;
            if (highRes) {
                width = el.offsetWidth * window.devicePixelRatio;
                height = el.offsetHeight * window.devicePixelRatio;
            } else {
                width = el.offsetWidth;
                height = el.offsetHeight;
            }
            try {
                const resizedImage = await resizeImage(image, width, height, { type, quality });
                process.signal?.throwIfAborted();
                const objectURL = URL.createObjectURL(resizedImage);
                ImagePreview.setBackground(el, objectURL, { method, imageText });
                resolve([resizedImage, objectURL]);
            } catch (error) {
                reject(error);
            }
        }, handle, {
            processName: "imagetoelement",
            processTitle: "Image to Element"
        });
        if (attachProcess) {
            const process = cancelablePromise.process;
            process.attachToElement(el);
            process.delayedInfoToggler(el, { adjacency: adjacencyPositions.beforeend });
        }
        return cancelablePromise;
    }
    static transformMimeArrayToObjectElement(mimeTypes, resultObject = {}) {
        mimeTypes.forEach(mimeType => {
            const [type, subtype] = mimeType.split("/");
            const prefix = `${type}/*`;
            if (!resultObject[prefix]) {
                resultObject[prefix] = [];
            }
            resultObject[prefix].push(`.${subtype}`);
        });
        return resultObject;
    }
    static getFileUploadCapableCallback(url, onFile, dimensionRequirements, { uploadOnly = false } = {}) {
        return async (file, imagePreview) => {
            if (onFile) {
                onFile(file, imagePreview);
            }
            const area = globalAreas.relative(imagePreview.element);
            const abortController = area.provideAbortController();
            const process = new Process("imageupload", "Image Upload", { handle: abortController });
            try {
                const image = await createImageBitmap(file);
                if (dimensionRequirements) {
                    validateImageDimensions(image, dimensionRequirements.minWidth, dimensionRequirements.minHeight);
                }
                const promises = [
                    uploadFile(url, file, process, { fileName: file.name }),
                ];
                if (!uploadOnly) {
                    promises.push(imagePreview.setImage(file, file.name, { handle: process, attachProcess: false }));
                }
                const promise = Promise.all(promises);
                Process.processToResolvers(process, promise);
            } catch (error) {
                notificationsCenter.sendParams(error.message || error, { type: "error" });
                console.error(error);
            }
        }
    }
    static withFileUpload(url, { options = {}, dimensionRequirements }) {
        const uploadCallback = ImagePreview.getFileUploadCapableCallback(url, options.onFile, dimensionRequirements);
        options.onFile = uploadCallback;
        return new ImagePreview(options);
    }
    static withFileDownload(url, options, { downloadOnly = false } = {}) {
        const imagePreview = new ImagePreview(options);
        let networkPromise;
        imagePreview.addEventListener("connectedfirst", async () => {
            const area = globalAreas.relative(imagePreview.element);
            const abortController = area.provideAbortController();
            const process = new Process("imagepresent", "Image Present", { handle: abortController });
            process.delayedInfoToggler(imagePreview.element, { adjacency: adjacencyPositions.beforeend });
            networkPromise = networkRequest(url, process, { asFile: true, handleSignal: true });
            networkPromise.then(async file => {
                try {
                    imagePreview.validateType(file.type);
                } catch (error) {
                    notificationsCenter.sendParams("Incorrect file format", { type: "error" });
                    process.fail(error);
                }
                // Was not aborted or stopped in other way.
                if (process.isRunning) {
                    if (typeof options?.onFile === "function") {
                        options.onFile(file, imagePreview);
                    }
                    if (!downloadOnly) {
                        await imagePreview.setImage(file, file.name, { handle: process, attachProcess: false });
                    }
                    process.complete();
                }
            }).catch(error => {
                console.trace(error);
                if (!(error instanceof NetworkAbortException) && !CancelablePromise.isPromiseAbortException(error)) {
                    notificationsCenter.sendText("Could not download image");
                    process.fail();
                    console.error(error);
                }
            });
        });
        imagePreview.addEventListener("setimage", () => {
            if (networkPromise.state === promiseStates.pending) {
                networkPromise.cancel();
            }
        }, { once: true });
        return imagePreview;
    }
    static withFileDownloadAndUpload(downloadURL, uploadURL, { options = {}, uploadDimensionRequirements } = {}) {
        options.onFile = ImagePreview.getFileUploadCapableCallback(uploadURL, options.onFile, uploadDimensionRequirements);
        const imagePreview = ImagePreview.withFileDownload(downloadURL, options, { downloadOnly: true });
        return imagePreview;
    }
}