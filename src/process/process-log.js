"use strict";

import { createElement, prependChild } from "../core/functions/node.js";
import { ArrayPairsStoreManager } from "../core/store/array-pairs-store-manager.js";
import { Article } from "../element/article.js";
import { StoreListing } from "../element/listing/store-listing.js";
import { ProgressRunner } from "./progress-runner.js";

export const processesCenter = (() => {
    const manager = {
        processesStore: new ArrayPairsStoreManager,
        runningCount: 0,
        isMainRunning: false,
        defaultProgressRunner: new ProgressRunner,
        add(process) {
            this.processesStore.add(process, process.id, {
                // Enables reversed order.
                position: 0
            });
        },
        delete(process) {
            if (!this.processesStore.hasKey(process.id)) {
                return null;
            }
            if (!this.processesStore.delete(process.id)) {
                return false;
            }
            return true;
        },
        start(process) {
            this.increaseRunningProcessesCount();
            if (process.options.category === "main") {
                this.defaultProgressRunner.reset();
                if (process.options.supportsProgress) {
                    this.defaultProgressRunner.progressTo(process.progressNumber);
                } else {
                    this.defaultProgressRunner.progressPlanTo({ timeout: process.options.timeout });
                }
                process.addEventListener("progress", e => {
                    this.defaultProgressRunner.progressTo(e.detail.progress, 500);
                });
                process.addEventListener("ended", () => {
                    this.defaultProgressRunner.complete();
                });
            }
            process.addEventListener("ended", () => {
                this.decreaseRunningProcessesCount();
            });
        },
        dispatchRunningProcessesCountChange() {
            document.dispatchEvent(new CustomEvent("runninprocessescountchange", {
                detail: { count: this.runningCount }
            }));
        },
        increaseRunningProcessesCount() {
            this.runningCount++;
            this.dispatchRunningProcessesCountChange();
        },
        decreaseRunningProcessesCount() {
            if (this.runningCount !== 0) {
                this.runningCount--;
                this.dispatchRunningProcessesCountChange();
            }
        },
        toElementRepresentative({ includeCombinedProcessesStatus = true } = {}) {
            const article = new Article("Processes Center", {
                classes: ["processes-center"],
                includeStory: true,
            });
            if (includeCombinedProcessesStatus) {
                article.header.append(this.getCombinedProcessesStatusElement());
            }
            article.insertIntoStory(this.defaultProgressRunner.toElement());
            return article;
        },
        toElement({ includeCombinedProcessesStatus = true } = {}) {
            return this.toElementRepresentative({ includeCombinedProcessesStatus }).element;
        },
        releaseListing({ customOptions = {} } = {}) {
            const listing = new StoreListing(this.processesStore, "Processes Log", {
                ...customOptions,
                searchable: true,
                keyAsDataId: true,
                itemBindings: ({ item, element, controls }) => {
                    const { deleteController } = controls;
                    if (item._menu) {
                        item._menu.append(deleteController.button, "delete");
                    }
                    if (typeof customOptions === "object" && Object.hasOwn(customOptions, "itemBindings")) {
                        customOptions.itemBindings({ item, element, controls });
                    }
                },
                deleteEntriesMessages: {
                    confirm: {
                        one: ({ originalElement: process }) => `Do you really want to delete "${process.title.rawValue || process.title}" from processes log?`,
                    }
                }
            });
            const controlsMenu = listing.releaseControlsMenu({ includeDeleteSelected: true });
            controlsMenu.appendTo(listing.footer);
            return listing;
        },
        getCombinedProcessesStatusElement({ tag = "div" } = {}) {
            const element = createElement(tag, { classes: ["combined-processes-status"] });
            if (this.runningCount !== 0) {
                element.setAttribute("data-status", "running");
                element.innerText = "Running";
            }
            document.addEventListener("runninprocessescountchange", e => {
                if (e.detail.count !== 0 && element.getAttribute("data-status") !== "running") {
                    element.setAttribute("data-status", "running");
                    element.innerText = "Running";
                } else if(e.detail.count === 0 && element.getAttribute("data-status") !== "pending") {
                    element.setAttribute("data-status", "pending");
                    element.innerText = "Pending";
                }
            });
            return element;
        }
    };
    document.addEventListener("processregister", e => {
        const { process } = e.detail;
        if (process.category !== "listing") {
            manager.add(process);
        }
        process.addEventListener("start", () => {
            manager.start(process);
        });
    });
    const exposure = {
        get runningCount() {
            return manager.runningCount;
        },
        get isMainRunning() {
            return manager.isMainRunning;
        },
        releaseListing({ customOptions = {} } = {}) {
            return manager.releaseListing({ customOptions });
        },
        toElementRepresentative() {
            return manager.toElementRepresentative();
        },
        toElement({ includeCombinedProcessesStatus } = {}) {
            return manager.toElement({ includeCombinedProcessesStatus });
        },
        appendToBody(doc, { includeCombinedProcessesStatus } = {}) {
            doc = doc || document;
            doc.body.appendChild(this.toElement({ includeCombinedProcessesStatus }));
        },
        prependToBody(doc, { includeCombinedProcessesStatus } = {}) {
            doc = doc || document;
            prependChild(doc.body, this.toElement({ includeCombinedProcessesStatus }));
        },
        getCombinedProcessesStatusElement({ tag = "div" } = {}) {
            return manager.getCombinedProcessesStatusElement({ tag });
        }
    }
    Object.freeze(exposure);
    return exposure;
})();