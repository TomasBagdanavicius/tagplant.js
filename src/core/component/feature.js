"use strict";

import { validateVarInterface } from "../functions/misc.js";
import { enumList } from "../functions/enumeration.js";
import { EventListenersController } from "../events/event-listeners-controller.js";
import { StatusesMixin } from "../mixins/statuses.js";
import { ElementRepresentative } from "../element/element-representative.js";

export const Feature = (() => {
    return class extends EventTarget {
        #content;
        #name;
        #isHTMLElement;
        constructor(content, name) {
            validateVarInterface(content, [Element, ElementRepresentative]);
            super();
            this.#content = content;
            this.#isHTMLElement = content instanceof Element;
            this.#name = name;
        }
        get content() {
            return this.#content;
        }
        get name() {
            return this.#name;
        }
        get element() {
            return this.#isHTMLElement ? this.#content : this.#content.element;
        }
    }
})();

export const DynamicFeature = (() => {
    const statuses = enumList({
        passive: "passive",
        active: "active"
    }, "activeFeatureStatuses");
    const privateMethods = {};
    const Mixin = StatusesMixin({ parentConstructor: Feature, statuses, defaultStatus: statuses.passive, privateMethods });
    return class extends Mixin {
        #activate;
        #deactivate;
        #listeners;
        #listenersTarget;
        #eventsController;
        #changeStatus;
        #setStatus;
        constructor(content, name, activate, deactivate, { listeners, startActive = false, listenersTarget } = {}) {
            super(content, name);
            this.#changeStatus = privateMethods.changeStatus;
            this.#setStatus = privateMethods.setStatus;
            this.#listeners = listeners;
            this.#listenersTarget = listenersTarget;
            if (listeners) {
                this.#eventsController = new EventListenersController(listeners, listenersTarget || content);
            }
            this.#activate = activate;
            this.#deactivate = deactivate;
            if (startActive) {
                this.#setStatus(statuses.active);
                if (this.#eventsController) {
                    this.#eventsController.add();
                }
            }
        }
        get listeners() {
            return Object.assign({}, this.#listeners);
        }
        get listenersTarget() {
            return this.#listenersTarget;
        }
        activate() {
            if (!this.isPassive) {
                throw new DOMException("Only passive feature can be activated");
            }
            if (this.#eventsController) {
                this.#eventsController.add();
            }
            this.#activate();
            this.#changeStatus(statuses.active);
        }
        deactivate() {
            if (!this.isActive) {
                throw new DOMException("Only active feature can be deactivated");
            }
            if (this.#eventsController) {
                this.#eventsController.remove();
            }
            this.#deactivate();
            this.#changeStatus(statuses.passive);
        }
    }
})();