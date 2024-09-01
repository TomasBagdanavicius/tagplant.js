"use strict";

import { createElement, createSimpleButton, isElementInFullscreen } from "../core/functions/node.js";
import { adjacencyPositions } from "../core/functions/enumeration.js";
import { EventListenersController } from "../core/events/event-listeners-controller.js";
import { WebComponentMixin } from "../core/web-component/web-component-mixin.js";
import { Process } from "../process/process.js";
import { notificationsCenter } from "./site-notifications.js";
import { userPaths } from "../../var/paths.js";

export const fullscreen = (() => {
    let isFullscreen = false;
    let isNotifications = false;
    const docListeners = {
        fullscreenchange: {
            type: "fullscreenchange",
            args: [
                () => {
                    const oldFullscreenMode = isFullscreen;
                    isFullscreen = !!document.fullscreenElement;
                    // It is possible to bring in element into fullscreen, while another element is already in that mode
                    if (oldFullscreenMode !== isFullscreen) {
                        document.dispatchEvent(new CustomEvent("fullscreentoggle", {
                            detail: { oldFullscreenMode, newFullscreenMode: isFullscreen }
                        }));
                    }
                }
            ]
        },
        fullscreentoggle: {
            type: "fullscreentoggle",
            args: [
                e => {
                    if (isNotifications) {
                        let message;
                        if (e.detail.newFullscreenMode) {
                            message = `You are now in fullscreen mode`;
                        } else {
                            message = `You have been taken out of fullscreen mode`;
                        }
                        notificationsCenter.sendText(message, { broadcast: false });
                    }
                }
            ]
        }
    }
    const docListenersController = new EventListenersController(docListeners, document);
    docListenersController.add();
    class FullscreenToggler extends WebComponentMixin({ options: { observeStylesheet: true } }) {
        static observedAttributes = [...super.observedAttributes, "target", "status"];
        #textCopy;
        constructor() {
            super();
            document.addEventListener("fullscreenchange", e => {
                if (e.target === this.targetElement) {
                    if (this.isFullscreen) {
                        this.dispatchEvent(new CustomEvent("enterfullscreen"));
                    } else {
                        this.dispatchEvent(new CustomEvent("exitfullscreen"));
                    }
                }
                this.setStatus();
            });
        }
        connectedCallback() {
            super.connectedCallback();
            this.#textCopy = this.textContent;
            // Removes text content
            this.replaceChildren();
            this.setStatus();
            const button = createSimpleButton(this.#textCopy);
            button.setAttribute("part", "button");
            button.title = "Toggle Fullscreen";
            button.addEventListener("click", async () => {
                button.disabled = true;
                const processArgs = [];
                if (!this.isFullscreen) {
                    processArgs.push("enterfullscreen", "Enter Fullscreen");
                } else {
                    processArgs.push("exitfullscreen", "Exit Fullscreen");
                }
                const togglePromise = this.toggle();
                const process = Process.wrapAroundPromise(togglePromise, processArgs);
                process.delayedInfoToggler(button, {
                    adjacency: adjacencyPositions.afterbegin,
                    tag: "span"
                });
                try {
                    await togglePromise;
                } catch (error) {
                    console.error(error);
                } finally {
                    button.disabled = false;
                }
            });
            this.shadowRoot.append(button);
        }
        attributeChangedCallback(name, oldValue, newValue) {
            super.attributeChangedCallback(name, oldValue, newValue);
            switch (name) {
                case "target":
                    this.setStatus();
                    break;
                case "status": {
                    const statusText = this.statusText;
                    // Lock in the internal status
                    if (newValue !== statusText) {
                        this.setAttribute("status", statusText);
                    }
                    break;
                }
            }
        }
        get textCopy() {
            return this.#textCopy;
        }
        get statusText() {
            return !this.isFullscreen ? "off" : "on";
        }
        setStatus() {
            this.setAttribute("status", this.statusText);
        }
        get targetSelector() {
            return this.hasAttribute("target")
                ? `#${this.getAttribute("target")}`
                : "html";
        }
        get targetElement() {
            return document.querySelector(this.targetSelector);
        }
        get isFullscreen() {
            return isElementInFullscreen(this.targetElement);
        }
        async enter() {
            if (this.isFullscreen) {
                throw new TypeError("Element is already in fullscreen mode");
            }
            await this.targetElement.requestFullscreen();
            this.setAttribute("status", "on");
        }
        async exit() {
            if (!this.isFullscreen) {
                throw new TypeError("Element is not in fullscreen mode");
            }
            await document.exitFullscreen();
            this.setAttribute("status", "off");
        }
        async toggle() {
            if (!this.isFullscreen) {
                return this.enter();
            } else {
                return this.exit();
            }
        }
    }
    if (!customElements.get("fullscreen-toggler")) {
        customElements.define("fullscreen-toggler", FullscreenToggler);
    }
    const exposure = {
        isFullscreen() {
            return isFullscreen;
        },
        get fullscreenTogglerConstructor() {
            return FullscreenToggler;
        },
        isRootFullscreen() {
            return document.fullscreenElement === document.documentElement;
        },
        async putRootFullscreen({ sendNotifications = false } = {}) {
            let message;
            try {
                await document.documentElement.requestFullscreen();
                if (sendNotifications) {
                    message = `Root is now in fullscreen mode`;
                }
            } catch (error) {
                if (sendNotifications) {
                    message = `Could not put root into fullscreen mode`;
                }
                console.error(error);
            } finally {
                if (message) {
                    notificationsCenter.sendText(message, { broadcast: false });
                }
            }
        },
        async exitFullscreen({ sendNotifications = false } = {}) {
            if (isFullscreen) {
                let message;
                try {
                    // Note: `document.exitFullscreen()` restores the previous state of the screen
                    while (document.fullscreenElement) {
                        await document.exitFullscreen();
                    }
                    if (sendNotifications) {
                        message = "You have been taken out of fullscreen mode";
                    }
                } catch (error) {
                    if (sendNotifications) {
                        message = "Could not exit fullscreen mode";
                    }
                    console.error(error);
                } finally {
                    if (message) {
                        notificationsCenter.sendText(message, { broadcast: false });
                    }
                }
            }
        },
        releaseToggler({ text = "Toggle Fullscreen", targetId, stylesheet } = {}) {
            const attrs = {};
            if (targetId) {
                attrs.target = targetId;
            }
            if (stylesheet) {
                attrs.stylesheet = stylesheet;
            } else if (userPaths.stylesheets.fullscreenToggler) {
                attrs.stylesheet = userPaths.stylesheets.fullscreenToggler;
            }
            return createElement("fullscreen-toggler", { text, attrs });
        },
        enableNotifications() {
            isNotifications = true;
        },
        get isNotifications() {
            return isNotifications;
        },
        disableNotifications() {
            isNotifications = false;
        }
    }
    Object.freeze(exposure);
    return exposure;
})();