"use strict";

import { stringCapitalizeFirstLetter } from "../functions/string.js";
import { searchable, validateVarInterface } from "../functions/misc.js";
import { validateEnumMember } from "../functions/enumeration.js";

export const StatusesMixin = ({ parentConstructor = EventTarget, statuses, defaultStatus, buildIsMethods = true, privateMethods } = {}) => {
    const Mixin = class extends parentConstructor {
        #status;
        constructor(...args) {
            super(...args);
            if (typeof privateMethods === "object") {
                privateMethods.changeStatus = this.#changeStatus.bind(this);
                privateMethods.setStatus = this.#setStatus.bind(this);
            }
            this.#setStatus(defaultStatus);
            if (buildIsMethods) {
                // Dynamically creates "is" prefixed getter methods for each status, eg. `isPending`, etc.
                for (const [name, status] of Object.entries(statuses)) {
                    const methodName = `is${stringCapitalizeFirstLetter(name)}`;
                    Object.defineProperty(this, methodName, {
                        get: () => {
                            return this.#status === status;
                        }
                    });
                }
            }
        }
        get statuses() {
            return statuses;
        }
        get statusNames() {
            return Object.keys(statuses);
        }
        get status() {
            return this.#status;
        }
        #setStatus(status) {
            validateEnumMember(status, statuses._name);
            this.#status = status;
        }
        #changeStatus(status, { details = {} } = {}) {
            validateEnumMember(status, statuses._name);
            if (status !== this.#status) {
                const oldStatus = this.#status;
                this.#status = status;
                if ("dispatchEvent" in this) {
                    this.dispatchEvent(new CustomEvent("statuschange", {
                        detail: { ...details, newStatus: status, oldStatus }
                    }));
                }
            }
        }
        addStatusAttrTo(elem, { datasetPropName = "status" } = {}) {
            validateVarInterface(elem, Element);
            const attributeName = `data-${datasetPropName}`;
            elem.setAttribute(attributeName, "");
            const attr = elem.getAttributeNode(attributeName);
            this.updateStatusOnAttr(attr);
            return attr;
        }
        updateStatusOnAttr(attr) {
            validateVarInterface(attr, Attr);
            attr.value = this.#status.name;
            this.addEventListener("statuschange", e => {
                attr.value = e.detail.newStatus.name;
            });
        }
        updateStatusText(elem, search) {
            elem.textContent = this.#status.value;
            searchable(this.#status.value, search, elem);
            this.addEventListener("statuschange", e => {
                const { newStatus } = e.detail;
                elem.textContent = newStatus.value;
                searchable(newStatus.value, search, elem);
            });
        }
    }
    return Mixin;
}