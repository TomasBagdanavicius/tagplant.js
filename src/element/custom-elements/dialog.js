"use strict";

import { createElement } from "../../core/functions/node.js";
import { imageElementFromURL } from "../../core/functions/image.js";
import { WebComponentMixin } from "../../core/web-component/web-component-mixin.js";
import { Menu } from "../menu.js";

export function createDialog({ classes, id, okText, useCancel = true, cancelText, autofocus, elRefs = {}, useMenu = true } = {}) {
    const formElems = [];
    let autofocusTaken = false;
    let buttons = {};
    if (useCancel) {
        const cancelButtonSchema = {
            tag: "button",
            options: {
                text: cancelText ?? "Cancel",
                classes: ["cancel-button"],
                attrs: {
                    value: "cancel"
                }
            },
            ref: "cancel"
        };
        if (autofocus === "cancel" || autofocus !== "ok") {
            cancelButtonSchema.options.attrs.autofocus = "";
            autofocusTaken = true;
        }
        if (!useMenu) {
            formElems.push(cancelButtonSchema);
        } else {
            buttons.cancel = createElement(cancelButtonSchema.tag, cancelButtonSchema.options);
        }
    }
    const okButtonSchema = {
        tag: "button",
        options: {
            text: okText ?? "OK",
            classes: ["ok-button"],
            attrs: {
                value: "ok"
            }
        },
        ref: "ok"
    };
    if (autofocus === "ok" || !autofocusTaken) {
        okButtonSchema.options.attrs.autofocus = "";
    }
    if (!useMenu) {
        formElems.push(okButtonSchema);
    } else {
        buttons.ok = createElement(okButtonSchema.tag, okButtonSchema.options);
    }
    const options = {
        classes,
        id,
        elems: [{
            tag: "form",
            options: {
                attrs: {
                    method: "dialog",
                },
                elems: formElems
            },
            ref: "form"
        }]
    };
    const dialogEl = createElement("dialog", options, elRefs);
    if (useMenu) {
        const menu = new Menu({ headingText: "Options", type: Menu.types.regular, host: dialogEl});
        if (buttons.cancel) {
            menu.append(buttons.cancel, "cancel", { listItemClasses: ["cancel"] });
        }
        menu.append(buttons.ok, "ok", { listItemClasses: ["ok"] });
        menu.appendTo(elRefs.form);
    }
    return dialogEl;
}

/* Web Component */

class SiteDialog extends WebComponentMixin({ options: { observeStylesheet: true } }) {
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback();
        const elRefs = {};
        const params = { elRefs };
        if (this.hasAttribute("okText")) {
            params.okText = this.getAttribute("oktext");
        }
        if (this.hasAttribute("noCancel")) {
            params.useCancel = false;
        } else if (this.hasAttribute("cancelText")) {
            params.cancelText = this.getAttribute("canceltext");
        }
        if (this.hasAttribute("autofocus")) {
            params.autofocus = this.getAttribute("autofocus");
        }
        const dialogEl = createDialog(params);
        elRefs.form.classList.add("footer");
        const elems = [];
        if (this.hasAttribute("iconURL")) {
            elems.push(imageElementFromURL(this.getAttribute("iconURL"), "Icon"));
        }
        if (this.hasAttribute("title")) {
            elems.push(createElement("h6", { text: this.getAttribute("title"), classes: ["heading"] }));
        }
        elems.push(createElement("p", { text: this.getAttribute("text"), classes: ["text"] }));
        dialogEl.prepend(...elems);
        this.shadowRoot.append(dialogEl);
        dialogEl.addEventListener("close", () => {
            const closeEvent = new CustomEvent("close", {
                detail: { returnValue: dialogEl.returnValue }
            });
            this.dispatchEvent(closeEvent);
        });
        dialogEl.showModal();
    }
}
if (!customElements.get("site-dialog")) {
    customElements.define("site-dialog", SiteDialog);
}

export function confirmModal(text, options = {}) {
    return new Promise(resolve => {
        const attrs = { text, autofocus: "cancel" };
        const optionalAttrs = [
            "iconURL",
            "title",
            "okText",
            "cancelText",
            "stylesheet",
            "autofocus"
        ];
        for (const optionalAttr of optionalAttrs) {
            if (optionalAttr in options) {
                attrs[optionalAttr] = options[optionalAttr];
            }
        }
        const siteDialogOptions = { attrs };
        if ("classes" in options) {
            siteDialogOptions.classes = options.classes;
        }
        const siteDialogEl = createElement("site-dialog", siteDialogOptions);
        document.body.append(siteDialogEl);
        siteDialogEl.addEventListener("close", e => {
            resolve(e.detail.returnValue === "ok");
            siteDialogEl.remove();
        });
    });
}

export function alertModal(text, options = {}) {
    return new Promise(resolve => {
        const attrs = { text, autofocus: "ok", nocancel: "" };
        const optionalAttrs = [
            "iconURL",
            "title",
            "okText",
            "stylesheet",
            "autofocus"
        ];
        for (const optionalAttr of optionalAttrs) {
            if (optionalAttr in options) {
                attrs[optionalAttr] = options[optionalAttr];
            }
        }
        const siteDialogOptions = { attrs };
        if ("classes" in options) {
            siteDialogOptions.classes = options.classes;
        }
        const siteDialogEl = createElement("site-dialog", siteDialogOptions);
        document.body.append(siteDialogEl);
        siteDialogEl.addEventListener("close", () => {
            resolve();
            siteDialogEl.remove();
        });
    });
}