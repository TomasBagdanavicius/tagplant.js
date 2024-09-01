"use strict";

import { createElement, createSimpleButton, removeClasses, detachElement, isElementAttached } from "../core/functions/node.js";
import { promiseSeries, validateVarInterface, fillInSearachableElementValue, searchable } from "../core/functions/misc.js";
import { isNonNullObject } from "../core/functions/object.js";
import { enumList, adjacencyPositions, headingLevels } from "../core/functions/enumeration.js";
import { ExpiredAbortError, ExplicitAbortError, TimeoutException } from "../core/exceptions.js";
import { CancelablePromise } from "../core/process/cancelable-promise.js";
import { StatusesMixin } from "../core/mixins/statuses.js";
import { DescriptionListPairs } from "../element/description-list-pairs.js";
import { Article } from "../element/article.js";
import { Menu } from "../element/menu.js";
import { ManualPopover } from "../components/popover.js";
import { Area } from "../core/process/area.js";

export const Process = (() => {
    let processId = 0;
    const statuses = enumList({
        pending: "Pending",
        running: "Running",
        aborted: "Aborted",
        failed: "Failed",
        completed: "Completed"
    }, "processStatuses");
    const privateMethods = {};
    const Mixin = StatusesMixin({ statuses, defaultStatus: statuses.pending, privateMethods });
    return class extends Mixin {
        #id;
        #changeStatus;
        #options;
        #abortController;
        #signal;
        #startTime;
        #progress;
        #endTime;
        #timeSpent;
        #timeoutId;
        #ended = false;
        constructor(name, title, options = {}) {
            super();
            this.#changeStatus = privateMethods.changeStatus;
            processId++;
            this.#id = processId;
            this.#options = { ...this.constructor.defaultOptions, ...options };
            this.name = name || `process${this.#id}`;
            this.title = title || `Process #${this.#id}`;
            if (this.#options.handle) {
                const [abortController, signal] = this.constructor.unpackHandle(this.#options.handle);
                this.#abortController = abortController;
                this.#signal = signal;
            }
            if (this.#signal) {
                // Aborted outside of process
                this.#signal.addEventListener("abort", e => {
                    // Apart from base logic, prevents catching abort initiated inside `abort`, eg. no call to self
                    if (this.isRunning) {
                        const reason = e.target.reason;
                        // Expired abort is redundant
                        if (typeof reason !== "object" || !(reason instanceof ExpiredAbortError)) {
                            this.abort(reason);
                        }
                    }
                });
            }
            document.dispatchEvent(new CustomEvent("processregister", {
                detail: { process: this }
            }));
            if (this.#options.supportsProgress) {
                this.#progress = 0;
            }
        }
        get id() {
            return this.#id;
        }
        get keyPath() {
            return "id";
        }
        static get defaultOptions() {
            return {
                handle: undefined,
                timeout: undefined,
                category: "regular",
                supportsProgress: false
            };
        }
        get options() {
            return Object.assign({}, this.#options);
        }
        static get statuses() {
            return statuses;
        }
        get startTime() {
            return this.#startTime;
        }
        get endTime() {
            return this.#endTime;
        }
        get timeTaken() {
            return this.#timeSpent;
        }
        get abortController() {
            return this.#abortController;
        }
        get signal() {
            return this.#signal;
        }
        get progressNumber() {
            return this.#progress;
        }
        get isEnded() {
            return this.#ended;
        }
        get category() {
            return this.#options.category;
        }
        get details() {
            return this.#options.details;
        }
        start() {
            if (!this.isPending) {
                throw new DOMException("Only pending process can be started", "ProcessError");
            }
            this.#startTime = performance.now();
            if (this.options.timeout !== undefined && this.#abortController) {
                this.#timeoutId = setTimeout(() => {
                    this.#abortController.abort(new TimeoutException("The operation timed out"));
                }, this.options.timeout);
            }
            this.#changeStatus(statuses.running, {
                details: { startTime: this.#startTime }
            });
            this.dispatchEvent(new CustomEvent("start", {
                detail: { process: this, startTime: this.#startTime }
            }));
        }
        progress(value) {
            if (!this.isRunning) {
                throw new DOMException("Only running process can receive progress updates", "ProcessError");
            }
            value = Math.floor(value);
            this.#progress = value;
            this.dispatchEvent(new CustomEvent("progress", {
                detail: {
                    progress: value
                }
            }));
        }
        abort(reason) {
            if (!this.isRunning) {
                throw new DOMException("Only running process can be aborted", "ProcessError");
            }
            const abortError = new ExplicitAbortError("Aborted by application");
            if (!reason) {
                reason = abortError;
            }
            this.#stop();
            this.#changeStatus(statuses.aborted, { details: { reason } });
            if (this.#abortController && !this.#abortController.signal.aborted) {
                this.#abortController.abort(abortError);
            }
            this.#end();
        }
        stopTimeout() {
            if (!this.#timeoutId) {
                return null;
            }
            clearTimeout(this.#timeoutId);
        }
        #stop() {
            if (!this.isRunning) {
                throw new DOMException("Process is not running", "ProcessError");
            }
            if (this.#timeoutId !== undefined) {
                clearTimeout(this.#timeoutId);
            }
            this.#endTime = performance.now();
            this.#timeSpent = this.#endTime - this.#startTime;
        }
        #end() {
            this.#ended = true;
            this.dispatchEvent(new CustomEvent("ended", {
                detail: {
                    status: this.status,
                    startTime: this.#startTime,
                    endTime: this.#endTime,
                    timeSpent: this.#timeSpent
                }
            }));
        }
        fail(error) {
            if (!this.isRunning) {
                throw new DOMException("Only running process can be failed", "ProcessError");
            }
            this.#stop();
            this.#changeStatus(statuses.failed, { details: { error } });
            this.#end();
        }
        failIfRunning(error) {
            if (this.isRunning) {
                this.fail(error);
            }
        }
        complete() {
            if (!this.isRunning) {
                throw new DOMException("Only running process can be completed", "ProcessError");
            }
            this.#stop();
            this.#changeStatus(statuses.completed, { details: {
                startTime: this.#startTime,
                endTime: this.#endTime,
                timeSpent: this.#timeSpent
            } });
            this.#end();
        }
        toArticle({ search }) {
            const elRefs = {};
            const descriptionList = DescriptionListPairs.fromItems([{
                name: "status",
                title: "Status",
                value: this.status.value,
                ref: "statusEl",
            }, {
                name: "id",
                title: "ID",
                value: this.#id,
                ref: "idEl",
            }], elRefs);
            const article = new Article(this.title, {
                classes: ["process-info"],
                headingLevel: headingLevels.three,
            });
            searchable(this.title, search, article.heading);
            searchable(String(this.#id), search, elRefs.idEl.nextElementSibling);
            article.insert(descriptionList.element);
            const menu = new Menu({ headingText: "Controls", host: article.element });
            article.element._menu = menu;
            article.insert(menu.element);
            const addAbortButton = () => {
                if (!menu.list.has("abort")) {
                    const abortButtonEl = createSimpleButton("Abort");
                    abortButtonEl.addEventListener("click", () => {
                        this.abort("Aborted by user");
                    });
                    menu.append(abortButtonEl, "abort");
                } else {
                    menu.list.reattachItem("abort");
                }
            }
            if (this.#abortController && this.isRunning) {
                addAbortButton();
            }
            const { statusEl } = elRefs;
            searchable(this.status.value, search, statusEl.nextElementSibling);
            let progressTerm;
            let progressDetails;
            this.addEventListener("statuschange", e => {
                const { newStatus } = e.detail;
                statusEl.nextElementSibling.innerText = newStatus.value;
                searchable(newStatus.value, search, statusEl.nextElementSibling);
                switch (newStatus) {
                    case statuses.running:
                        if (this.#abortController) {
                            addAbortButton();
                        }
                        break;
                    case statuses.aborted: {
                        const reasonText = e.detail.reason !== undefined
                            ? e.detail.reason.message || e.detail.reason
                            : "N/A";
                        descriptionList.appendPair("Abort reason", reasonText);
                        break;
                    }
                    case statuses.failed:
                        descriptionList.appendPair("Error", e.detail.error.message ?? e.detail.error);
                        break;
                    case statuses.completed:
                        if (progressDetails) {
                            progressDetails.innerText = "100%";
                        }
                }
                if (menu.list.has("abort") && newStatus !== statuses.running) {
                    menu.list.detachItem("abort");
                }
            });
            const createProgressTerm = progressNum => {
                if (!progressTerm) {
                    [progressTerm, progressDetails] = descriptionList.appendPair(
                        "Progress",
                        `${progressNum}%`
                    );
                }
            }
            if (this.#progress !== undefined) {
                createProgressTerm(this.#progress);
            }
            this.addEventListener("progress", e => {
                const progressNum = e.detail.progress;
                if (!progressTerm) {
                    createProgressTerm(progressNum);
                } else {
                    progressDetails.innerText = `${progressNum}%`;
                }
            });
            descriptionList.appendPair("Category", this.category);
            return article;
        }
        toElementRepresentative({ search } = {}) {
            return this.toArticle({ search });
        }
        toElement({ search } = {}) {
            return this.toArticle({ search }).element;
        }
        attachToElement(el, togglingMethod = "popover") {
            let processInfoEl;
            let popoverManager;
            const eventHandlerParams = [
                e => {
                    e.preventDefault();
                    // Supress other listeners
                    e.stopImmediatePropagation();
                    if (!processInfoEl) {
                        processInfoEl = this.toElement();
                        el.insertAdjacentElement("afterend", processInfoEl);
                        if (togglingMethod === "popover") {
                            popoverManager = new ManualPopover(processInfoEl, {
                                toggler: el,
                                position: "BL"
                            });
                        }
                    } else {
                        if (togglingMethod === "popover") {
                            popoverManager.toggle();
                        } else {
                            if (!isElementAttached(processInfoEl)) {
                                el.insertAdjacentElement("afterend", processInfoEl);
                            } else {
                                detachElement(processInfoEl);
                            }
                        }
                    }
                },
                // Dispatch to this listener first thing
                true
            ];
            const withClassClickable = el.classList.contains("clickable");
            if (!withClassClickable) {
                el.classList.add("clickable");
            }
            el.addEventListener("click", ...eventHandlerParams);
            this.addEventListener("ended", () => {
                el.removeEventListener("click", ...eventHandlerParams);
                if (processInfoEl) {
                    processInfoEl.remove();
                }
                if (!withClassClickable) {
                    removeClasses(el, ["clickable"]);
                }
            });
        }
        createInfoToggler({ removeOnEnd = true, togglingMethod = "popover", tag = "div" } = {}) {
            const formattedStatusText = status => {
                return status === statuses.running
                    ? status.value.concat("...")
                    : status.value;
            }
            const toggler = createElement(tag, {
                text: formattedStatusText(this.status),
                classes: ["compact-process-info"]
            });
            toggler.setAttribute("data-status", this.status.name);
            this.addEventListener("statuschange", e => {
                const { newStatus } = e.detail;
                toggler.setAttribute("data-status", newStatus.name);
                toggler.innerText = formattedStatusText(newStatus);
            });
            this.addEventListener("ended", () => {
                if (removeOnEnd) {
                    toggler.remove();
                }
            });
            toggler.setAttribute("data-process", this.#id);
            toggler.setAttribute("data-process-name", this.name);
            this.attachToElement(toggler, togglingMethod);
            return toggler;
        }
        delayedInfoToggler(relativeEl, {
            delay = 250,
            removeOnEnd = true,
            adjacency = adjacencyPositions.afterend,
            tag = "div"
        } = {}) {
            validateVarInterface(relativeEl, Element);
            if (!this.#ended || !removeOnEnd) {
                let fulfilled = false;
                const cancelablePromise = Area.attachedTimeout(relativeEl, delay);
                cancelablePromise.then(() => {
                    fulfilled = true;
                    const toggler = this.createInfoToggler({ removeOnEnd, tag });
                    relativeEl.insertAdjacentElement(adjacency.name, toggler);
                }).catch(error => {
                    if (!CancelablePromise.isPromiseAbortException(error)) {
                        throw error;
                    }
                });
                this.addEventListener("ended", () => {
                    // Ended before timeout completed
                    if (!fulfilled) {
                        cancelablePromise.cancel();
                    }
                });
            }
        }
        attachedClassToggling(el, { className = "process-running", delay = 0 } = {}) {
            const add = () => {
                el.classList.add(className);
            }
            let fulfilled;
            let cancelablePromise;
            if (delay === 0) {
                add();
            } else {
                fulfilled = false;
                cancelablePromise = Area.attachedTimeout(el, delay);
                cancelablePromise.then(() => {
                    fulfilled = true;
                    add();
                }).catch(error => {
                    if (!CancelablePromise.isPromiseAbortException(error)) {
                        throw error;
                    }
                });
            }
            this.addEventListener("ended", () => {
                removeClasses(el, [className]);
                // Ended before timeout completed
                if (cancelablePromise !== undefined && !fulfilled) {
                    cancelablePromise.cancel();
                }
            });
        }
        toGroupMember({ search }) {
            return this.toElement({ search });
        }
        toElementChunks({ search, chunkList } = {}) {
            const chunkElems = {
                id: elem => {
                    const text = "#".concat(this.id);
                    fillInSearachableElementValue(elem, text, search);
                },
                name: elem => {
                    fillInSearachableElementValue(elem, this.name, search);
                },
                title: elem => {
                    fillInSearachableElementValue(elem, this.title, search);
                },
                status: elem => {
                    fillInSearachableElementValue(elem, this.status.value, search);
                    this.addEventListener("statuschange", e => {
                        const { newStatus } = e.detail;
                        fillInSearachableElementValue(elem, newStatus.value, search);
                    });
                },
                details: elem => {
                    fillInSearachableElementValue(elem, this.#options.details || "N/A", search);
                },
            };
            if (isNonNullObject(chunkList)) {
                const result = {};
                for (const chunkName of Object.keys(chunkList)) {
                    if (Object.hasOwn(chunkElems, chunkName)) {
                        result[chunkName] = chunkElems[chunkName];
                    }
                }
                return result;
            } else {
                return chunkElems;
            }
        }
        toItem() {
            return {
                id: this.#id,
                name: this.name,
                title: this.title,
                status: this.status.value,
                details: this.#options.details || "N/A",
            }
        }
        static get chunkNames() {
            return {
                id: "ID",
                name: "Name",
                title: "Title",
                status: "Status",
                details: "Details",
            };
        }
        static get sortValues() {
            return {
                id: "ID",
                name: "Name",
                title: "Title",
                status: "Status",
                details: "Details",
            }
        }
        static wrapAroundPromise(promise, args) {
            validateVarInterface(promise, Promise);
            const process = new Process(...args);
            process.start();
            Process.processToResolvers(process, promise);
            return process;
        }
        static unpackHandle(handle) {
            let abortController;
            let abortSignal;
            if (handle instanceof AbortController) {
                abortController = handle;
                abortSignal = handle.signal;
            } else if (handle instanceof AbortSignal) {
                abortSignal = handle;
            }
            return [abortController, abortSignal];
        }
        static wrapAroundPromiseSeries(tasks, args, { promiseSeriesOnPerform, promiseSeriesOnFinally } = {}) {
            if (args.length > 2) {
                args[2].supportsProgress = true;
            } else {
                args.push({
                    supportsProgress: true
                });
            }
            const process = new Process(...args);
            process.start();
            process.progress(0);
            const onPerform = (taskNumber, tasksTotal) => {
                const percentage = taskNumber / tasksTotal * 100;
                process.progress(percentage);
                if (typeof promiseSeriesOnPerform === "function") {
                    promiseSeriesOnPerform();
                }
            }
            const promise = promiseSeries(tasks, { signal: process.signal, onPerform, promiseSeriesOnFinally });
            Process.processToResolvers(process, promise);
            return [process, promise];
        }
        static processToResolvers(process, promise) {
            if (!process.isRunning) {
                throw new DOMException("Process must be running", "ProcessError");
            }
            promise.then(() => {
                if (process.isRunning) {
                    process.complete();
                }
            }).catch(error => {
                if (process.isRunning) {
                    if (error.name !== "AbortError") {
                        process.fail(error);
                    } else {
                        process.abort(error);
                    }
                }
            });
        }
    }
})();