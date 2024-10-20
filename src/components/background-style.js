"use strict";

import { removeClasses } from "../core/functions/node.js";
import { resizeImage } from "../core/functions/image.js";
import { adjacencyPositions } from "../core/functions/enumeration.js";
import { TaskPerformApplicationException } from "../core/exceptions.js";
import { EventListenersController } from "../core/events/event-listeners-controller.js";
import { Article } from "../element/article.js";
import { Group } from "../element/group.js";
import { alertModal } from "../element/custom-elements/dialog.js";
import { ImagePreview } from "../element/image-preview.js";
import { Process } from "../process/process.js";
import { Jobs, globalJobs } from "../process/jobs.js";
import { notificationsCenter } from "./site-notifications.js";
import { landingDatabaseManager } from "../../var/indexed-databases.js";
import { globalAreas } from "../core/process/area.js";
import { userPaths } from "../../var/paths.js";

export const backgroundStyle = (() => {
    const databaseManager = landingDatabaseManager;
    const colors = {
        "#363062": { name: "navy", title: "Navy" },
        "#9a031e": { name: "maroon", title: "Maroon" },
        "#6c5f5b": { name: "brown", title: "Brown" }
    };
    const colorItemMap = new Map;
    let area;
    let article;
    let activeItem;
    let noStyleItem;
    /* Either "color" or "background" */
    let style;
    /* Either color code or blob URL */
    let content;
    let imagePreview;
    let initialSetting;
    let initialSettingProcess;
    let bg;
    const broadcasting = new BroadcastChannel("backgroundStyle");
    const manager = {
        get area() {
            area ??= globalAreas.relative(article.element);
            return area;
        },
        get removeStyleJobs() {
            return globalJobs.filter("backgroundStyle", "removeStyle", false, this);
        },
        get setStyleJobs() {
            return globalJobs.filter("backgroundStyle", ["setColor", "setImage"], false, this);
        },
        getSetColorTasks(colorCode, signal) {
            return [
                () => this.removeBackgroundImage(false),
                () => databaseManager.saveValue("settings", "backgroundStyle", { value: colorCode }, { signal }),
                () => this.setBackgroundColor(colorCode),
                () => {
                    broadcasting.postMessage({
                        action: "set",
                        style,
                        value: colorCode,
                        title: colors[colorCode].title
                    });
                },
            ];
        },
        async setColor(colorCode) {
            const item = colorItemMap.get(colorCode);
            if (activeItem === item) {
                return null;
            }
            const abortController = this.area.provideAbortController();
            const process = new Process("backgroundstylechange", "Background Style Change", { handle: abortController });
            process.attachToElement(item);
            process.delayedInfoToggler(item, { adjacency: adjacencyPositions.beforeend, tag: "span" });
            process.start();
            try {
                await Jobs.waitFor(this.removeStyleJobs);
                await Jobs.cancel(this.setStyleJobs);
                const job = globalJobs.create("setColor", this.getSetColorTasks(colorCode), { category: "backgroundStyle", host: this });
                await job.do({ abortController });
                process.complete();
            } catch (error) {
                if (error.name !== "AbortError") {
                    let message = `Could not change background style to solid ${colors[colorCode].title} color`;
                    const alertOptions = {
                        classes: ["danger"],
                    };
                    if (userPaths?.stylesheets?.dialog) {
                        alertOptions.stylesheet = userPaths.stylesheets.dialog;
                    }
                    alertModal(message, alertOptions);
                    console.error(`${message}:`, error, error.cause, error.stack);
                }
                if (process.isRunning) {
                    process.fail(error);
                }
            }
        },
        getSetImageTasks(image, imageText, process) {
            return [
                async () => {
                    const width = screen.availWidth * window.devicePixelRatio;
                    const height = screen.availHeight * window.devicePixelRatio;
                    return await resizeImage(image, width, height);
                },
                async values => {
                    const [resizedImage] = values;
                    imageText = imageText || image.name;
                    const [setImageResult] = await Promise.all([
                        imagePreview.setImage(resizedImage, imageText, { handle: process, attachProcess: false }),
                        databaseManager.saveValue("settings", "backgroundStyle", { value: resizedImage })
                    ]);
                    return [...setImageResult, imageText];
                },
                async values => {
                    const [, [previewImage]] = values;
                    await Promise.all([
                        databaseManager.saveValue("settings", "backgroundStylePreview", { value: previewImage }),
                        this.removeBackgroundColor(false)
                    ]);
                },
                values => {
                    const [resizedImage, [previewImage, , previewImageText]] = values;
                    const objectURL = this.setBackgroundImage(resizedImage);
                    broadcasting.postMessage({
                        action: "set",
                        style,
                        value: objectURL,
                        previewImage,
                        previewImageText
                    });
                }
            ];
        },
        async setImage(image, imageText) {
            const abortController = this.area.provideAbortController();
            const process = new Process("backgroundstylechange", "Background Style Change", { handle: abortController });
            process.attachToElement(imagePreview.element);
            process.delayedInfoToggler(imagePreview.element, { adjacency: adjacencyPositions.beforeend });
            process.start();
            try {
                await Jobs.waitFor(this.removeStyleJobs);
                await Jobs.cancel(this.setStyleJobs);
                const job = globalJobs.create("setImage", this.getSetImageTasks(image, imageText, process), { category: "backgroundStyle", host: this });
                await job.do({ abortController });
                process.complete();
            } catch (error) {
                if (error.name !== "AbortError") {
                    let msg = `Could not set background image`;
                    if (error instanceof TaskPerformApplicationException && error.cause instanceof RangeError) {
                        msg = msg.concat(`. ${error.cause.message}`);
                    }
                    const alertOptions = {
                        classes: ["danger"],
                    };
                    if (userPaths?.stylesheets?.dialog) {
                        alertOptions.stylesheet = userPaths.stylesheets.dialog;
                    }
                    alertModal(msg, alertOptions);
                    console.error(msg, error, error.cause);
                }
                if (process.isRunning) {
                    process.fail(error);
                }
            }
        },
        unsetStyle({ resetVar = true } = {}) {
            if (style === "color") {
                this.unsetBackgroundColor();
            } else if (style === "background") {
                this.unsetBackgroundImage();
            }
            if (noStyleItem) {
                noStyleItem.classList.add("active");
                removeClasses(noStyleItem, "clickable");
            }
            if (activeItem) {
                removeClasses(activeItem, "active");
                activeItem.classList.add("clickable");
            }
            if (resetVar) {
                style = undefined;
            }
        },
        async removeStyle() {
            if (style === "color") {
                this.removeBackgroundColor();
            } else {
                this.removeBackgroundImage();
            }
        },
        loadInitialSetting() {
            // Since customizer element is not available at start, this goes onto the topmost area.
            const firstArea = globalAreas.first();
            const abortController = firstArea.provideAbortController();
            initialSetting = databaseManager.readValue("settings", "backgroundStyle", {
                signal: abortController.signal
            });
            initialSettingProcess = Process.wrapAroundPromise(initialSetting, [
                "initbgstyle",
                "Init Background Style",
                { handle: abortController }
            ]);
        },
        getCustomizer() {
            if (article) {
                return article.element;
            }
            article = new Article("Background Style", { classes: ["background-style"] });
            article.addEventListener("connectedfirst", () => {
                if (!initialSetting) {
                    this.loadInitialSetting();
                }
                // Initial setting is still loading
                if (initialSettingProcess.isRunning) {
                    initialSettingProcess.delayedInfoToggler(article.element, {
                        adjacency: adjacencyPositions.beforeend
                    });
                }
                initialSetting.then(record => {
                    const hasColor = record && typeof record.value === "string";
                    const group = new Group;
                    ([noStyleItem] = group.append(document.createTextNode("No Style")));
                    if (!record) {
                        noStyleItem.classList.add("active");
                    } else {
                        noStyleItem.classList.add("clickable");
                    }
                    noStyleItem.addEventListener("click", async () => {
                        if (!content) {
                            return;
                        }
                        noStyleItem.classList.add("active");
                        await this.removeStyle();
                        broadcasting.postMessage({
                            action: "unset"
                        });
                        notificationsCenter.sendText(`Background style removed`);
                    });
                    for (const [colorCode, color] of Object.entries(colors)) {
                        const [item] = group.append(document.createTextNode(color.title));
                        item.style.setProperty("background-color", colorCode);
                        item.addEventListener("click", () => {
                            this.setColor(colorCode, item);
                        });
                        if (hasColor && record.value === colorCode) {
                            activeItem = item;
                            item.classList.add("active");
                        } else {
                            item.classList.add("clickable");
                        }
                        colorItemMap.set(colorCode, item);
                    }
                    imagePreview = new ImagePreview({
                        onFile: file => {
                            this.setImage(file);
                        },
                        onBeforeUnset: () => this.removeBackgroundImage(),
                        onUnset: () => {
                            this.unsetStyle();
                            broadcasting.postMessage({
                                action: "unset"
                            });
                        }
                    });
                    group.append(imagePreview.element);
                    article.insert(group.element);
                    if (style === "background") {
                        const abortController = this.area.provideAbortController();
                        databaseManager.readValue("settings", "backgroundStylePreview", { signal: abortController.signal }).then(record => {
                            if (record !== null) {
                                imagePreview.setImage(record.value);
                            }
                        });
                    }
                }).catch(error => {
                    if (error.name !== "AbortError") {
                        console.error(error);
                    }
                });
            });
            return article.element;
        },
        setBackgroundImage(image, { sendNotification = true } = {}) {
            const url = URL.createObjectURL(image);
            this.setBackgroundImageFromURL(url, { sendNotification });
            return url;
        },
        setBackgroundImageFromURL(url, { sendNotification = true } = {}) {
            if (bg) {
                bg.style.setProperty("background-image", `url("${url}")`);
                bg.classList.add("has-background-style", "has-background-style-image");
            }
            if (noStyleItem) {
                removeClasses(noStyleItem, "active");
                noStyleItem.classList.add("clickable");
            }
            style = "background";
            content = url;
            if (bg && sendNotification) {
                notificationsCenter.sendText("Background style changed to custom image", { broadcast: false });
            }
        },
        unsetBackgroundImage() {
            if (bg) {
                bg.style.setProperty("background-image", "");
                removeClasses(bg, ["has-background-style", "has-background-style-image"]);
            }
        },
        async removeBackgroundImage(deleteMainRecord = true) {
            const promises = [
                databaseManager.deleteRecord("settings", "backgroundStylePreview")
            ];
            if (deleteMainRecord) {
                promises.push(databaseManager.deleteRecord("settings", "backgroundStyle"));
            }
            await Promise.all(promises);
            if (imagePreview.hasImage) {
                imagePreview.unsetImage(false);
            }
            this.unsetBackgroundImage();
            content = undefined;
        },
        setBackgroundColor(color, { sendNotification = true } = {}) {
            if (bg) {
                bg.style.setProperty("background-color", color);
                bg.classList.add("has-background-style", "has-background-style-color");
            }
            if (imagePreview) {
                const customizerItem = colorItemMap.get(color);
                customizerItem.classList.add("active");
                removeClasses(customizerItem, "clickable");
                if (activeItem) {
                    removeClasses(activeItem, "active");
                    activeItem.classList.add("clickable");
                }
                activeItem = customizerItem;
                removeClasses(noStyleItem, "active");
                noStyleItem.classList.add("clickable");
            }
            style = "color";
            content = color;
            if (bg && sendNotification) {
                notificationsCenter.sendText(`Background style changed to solid ${colors[color].title} color`, {
                    broadcast: false,
                    category: "bgStyleChange",
                });
            }
        },
        unsetBackgroundColor() {
            if (bg) {
                bg.style.setProperty("background-color", "");
                removeClasses(bg, ["has-background-style", "has-background-style-color"]);
            }
        },
        async removeBackgroundColor(deleteRecord = true) {
            if (deleteRecord) {
                await databaseManager.deleteRecord("settings", "backgroundStyle");
            }
            if (activeItem) {
                removeClasses(activeItem, "active");
                activeItem.classList.add("clickable");
                activeItem = undefined;
            }
            this.unsetBackgroundColor();
            style = undefined;
            content = undefined;
        }
    }
    const broadcastingListeners = {
        message: {
            type: "message",
            args: [
                e => {
                    const { action, style: newStyle, value, previewImage, previewImageText } = e.data;
                    if (action === "set") {
                        if (newStyle === "color") {
                            if (style === "background") {
                                manager.unsetBackgroundImage();
                            }
                            manager.setBackgroundColor(value);
                        } else {
                            if (style === "color") {
                                manager.unsetBackgroundColor();
                            }
                            manager.setBackgroundImageFromURL(value);
                            imagePreview.setImage(previewImage, previewImageText);
                        }
                    } else {
                        if (newStyle === "color") {
                            manager.unsetBackgroundColor();
                        } else if (newStyle === "background") {
                            manager.unsetBackgroundImage();
                        } else {
                            manager.unsetStyle();
                            imagePreview.unsetImage(false);
                        }
                    }
                }
            ]
        }
    }
    const broadcastingController = new EventListenersController(broadcastingListeners, broadcasting);
    const exposure = {
        getCustomizer() {
            return manager.getCustomizer();
        },
        appendCustomizerToBody(doc) {
            doc = doc || document;
            doc.body.appendChild(this.getCustomizer());
        },
        apply() {
            bg = document.body;
            if (!content) {
                if (!initialSetting) {
                    manager.loadInitialSetting();
                }
                initialSetting.then(record => {
                    if (record !== null) {
                        if (record.value instanceof Blob) {
                            manager.setBackgroundImage(record.value, { sendNotification: false });
                        } else {
                            manager.setBackgroundColor(record.value, { sendNotification: false });
                        }
                    }
                }).catch(error => {
                    const text = "Could not load background style";
                    notificationsCenter.sendParams(text, { type: "error" });
                    console.error(text.concat("."), error);
                });
            } else {
                if (style === "background") {
                    manager.setBackgroundImageFromURL(content, { sendNotification: false });
                } else {
                    manager.setBackgroundColor(content, { sendNotification: false });
                }
            }
            broadcastingController.add();
        },
        remove() {
            if (initialSettingProcess.isRunning) {
                initialSettingProcess.abort();
            }
            broadcastingController.remove();
            manager.unsetStyle({ resetVar: false });
            bg = undefined;
            /* Content should not be reset here, because then in `apply`, in case initial setting record was null, content will not be recovered. To overcome this, `initialSetting` would have to be nullified as well. */
        }
    }
    Object.freeze(exposure);
    return exposure;
})();