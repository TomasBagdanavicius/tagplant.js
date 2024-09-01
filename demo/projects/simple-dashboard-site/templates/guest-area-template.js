"use strict";

import { createElement, createHyperlink, detachElement } from "../../../../src/core/functions/node.js";
import { ComponentCollection } from "../../../../src/core/component/component-collection.js";
import { DynamicFeature } from "../../../../src/core/component/feature.js";
import { clockFeature } from "../../../../src/components/clock-feature.js";
import { notificationsCenter } from "../../../../src/components/site-notifications.js";
import { colorMode } from "../../../../src/components/color-mode.js";
import { Template } from "../../../../src/site/template.js";
import { SiteComponent } from "../../../../src/site/site.js";
import { Menu } from "../../../../src/element/menu.js";
import { dateTimeFormats } from "../../../../var/date-time-formats.js";

export class GuestAreaTemplate extends Template {
    constructor(data) {
        super(data);
    }
    getParts() {
        const nodes = new Set;
        const components = new ComponentCollection;
        const main = createElement("main");
        const clockComponent = GuestAreaTemplate.buildClockComponent();
        nodes.add(clockComponent.element);
        components.add(clockComponent);
        nodes.add(main);
        const settingsPane = this.buildSettingsPane();
        nodes.add(settingsPane);
        const colorModeMenuComponent = GuestAreaTemplate.buildColorModeMenuComponent();
        colorModeMenuComponent.element.classList.add("color-mode-menu");
        components.add(colorModeMenuComponent);
        const clockFeatureFormatMenu = clockFeature.releaseFormatMenu({
            headingText: "Format",
            type: Menu.types.toggle,
            selectValue: true,
        });
        clockFeatureFormatMenu.element.classList.add("clock-format-menu");
        clockFeature.getFormat().then(format => {
            clockFeatureFormatMenu.headingText = dateTimeFormats[format].title;
        });
        clockFeatureFormatMenu.addEventListener("changeselectvalue", e => {
            clockFeatureFormatMenu.headingText = dateTimeFormats[e.detail.newKey].title;
        });
        settingsPane.append(clockFeatureFormatMenu.element, colorModeMenuComponent.element);
        clockFeature.addEventListener("statechange", e => {
            const { newState } = e.detail;
            if (newState) {
                const clockVisibilityControl = settingsPane.querySelector(":scope > .clock-visibility-control");
                clockVisibilityControl.after(clockFeatureFormatMenu.element);
            } else {
                detachElement(clockFeatureFormatMenu.element);
            }
        });
        return { nodes, components, main };
    }
    buildSettingsPane() {
        const pane = createElement("div", { classes: ["settings-pane"] });
        const clockVisibilityControl = clockFeature.releaseVisibilityControl({
            label: "Clock",
        });
        clockVisibilityControl.classList.add("clock-visibility-control");
        const processesHyperlink = createHyperlink("#processes", "Processes");
        processesHyperlink.title = "Processes";
        processesHyperlink.classList.add("processes");
        pane.append(clockVisibilityControl, processesHyperlink);
        return pane;
    }
    static buildClockFeature() {
        const container = createElement("div", { classes: ["clock-container"] });
        const controller = clockFeature.defaultLocalStorageStoreController;
        controller.getKeyByName = name => {
            switch (name) {
                case "state":
                    return "testDashboardSiteClockVisibility";
                case "format":
                    return "testDashboardSiteClockFormat";
            }
        },
        controller.format = "SimpleDateTime";
        clockFeature.setCustomStoreController(controller, {
            apply: true
        });
        const attachmentController = {
            host: container,
            attach(elem) {
                this.host.append(elem);
            },
            remove() {
                this.host.firstElementChild.remove();
            }
        };
        clockFeature.releaseElement(attachmentController, { contentFormat: "html" });
        const listeners = {
            statechange: {
                type: "statechange",
                args: [
                    e => {
                        const { newState, oldState } = e.detail;
                        if (oldState !== undefined) {
                            let message;
                            if (newState) {
                                message = "Clock has been enabled";
                            } else {
                                message = "Clock has been disabled";
                            }
                            notificationsCenter.sendText(message, {
                                broadcast: false,
                                category: "clockStatus"
                            });
                        }
                    }
                ]
            },
            formatchange: {
                type: "formatchange",
                args: [
                    e => {
                        const { newFormat, oldFormat } = e.detail;
                        if (oldFormat !== undefined) {
                            const formatInfo = dateTimeFormats[newFormat];
                            const formatter = new Intl.DateTimeFormat(document.documentElement.lang, formatInfo.options);
                            const timePreview = formatter.format(new Date);
                            notificationsCenter.sendText(`Clock format changed to "${formatInfo.title}" ${timePreview}`, {
                                broadcast: false,
                                category: "clockFormat"
                            });
                        }
                    }
                ]
            }
        }
        const start = () => {
            if (attachmentController.clockPiece) {
                attachmentController.clockPiece.start();
            }
        }
        const stop = () => {
            if (attachmentController.clockPiece) {
                attachmentController.clockPiece.stop();
            }
        }
        return new DynamicFeature(container, "clock", start, stop, {
            listeners,
            startActive: true,
            listenersTarget: clockFeature
        });
    }
    static buildClockComponent() {
        return new SiteComponent(GuestAreaTemplate.buildClockFeature(), {
            name: "clock",
        });
    }
    static buildColorModeMenuFeature() {
        const menu = colorMode.releaseMenu({ type: Menu.types.toggle, selectValue: true });
        menu.headingText = colorMode.colorMode.value;
        document.addEventListener("colormodechange", e => {
            const { newColorMode } = e.detail;
            menu.headingText = newColorMode.value;
        });
        const activate = () => {
            const storeController = colorMode.defaultLocalStorageStoreController;
            storeController.key = "testDashboardSiteColorMode";
            colorMode.setCustomStoreController(storeController, { apply: true });
        }
        const deactivate = () => {
            colorMode.unsetCustomStoreController();
        }
        return new DynamicFeature(menu, "color-mode-menu", activate, deactivate);
    }
    static buildColorModeMenuComponent() {
        return new SiteComponent(this.buildColorModeMenuFeature(), { name: "color-mode-menu" });
    }
}