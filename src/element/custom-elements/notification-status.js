"use strict";

import { createElement, createDetailsElement } from "../../core/functions/node.js";
import { WebComponentMixin } from "../../core/web-component/web-component-mixin.js";

export class NotificationStatus extends WebComponentMixin({ options: { observeStylesheet: true } }) {
    #state;
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback();
        this.setState(Notification.permission);
        navigator.permissions.query({ name: "notifications" }).then(permissionStatus => {
            permissionStatus.onchange = () => {
                // State can be "granted", "denied", "prompt".
                this.setState(permissionStatus.state);
            };
        });
    }
    setState(newState) {
        if (this.#state !== newState) {
            this.#state = newState;
            this.setAttribute("state", newState);
            this.removeNonLinkChildrenInShadowRoot();
            switch (newState) {
                case "default":
                case "prompt": {
                    const enableButton = this.buildEnableButton();
                    enableButton.title = "Enable Notifications";
                    this.shadowRoot.append(enableButton);
                    break;
                }
                case "granted":
                case "denied": {
                    const details = this.buildDetailsElement(newState);
                    this.shadowRoot.append(details);
                    break;
                }
            }
        }
    }
    buildEnableButton() {
        const button = createElement("button", {
            attrs: {
                type: "button"
            },
            text: "Enable Notifications"
        });
        button.addEventListener("click", async () => {
            const state = await Notification.requestPermission();
            this.setState(state);
        });
        return button;
    }
    buildDetailsElement(state) {
        if (state === "granted") {
            const paragraph = createElement("p", { text: "You have enabled notifications in this browser." });
            const [elem] = createDetailsElement("Notifications enabled", paragraph);
            return elem;
        } else if (state === "denied") {
            const paragraph = createElement("p", { text: "You have disabled notifications in this browser." });
            const [elem] = createDetailsElement("Notifications disabled", paragraph);
            return elem;
        } else {
            return null;
        }
    }
}
customElements.define("notification-status", NotificationStatus);