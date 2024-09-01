"use strict";

import { isElementRootOrBody } from "../core/functions/node.js";
import { validateAttachmentController, validateVarInterface } from "../core/functions/misc.js";
import { enumList } from "../core/functions/enumeration.js";
import { StatusesMixin } from "../core/mixins/statuses.js";
import { DynamicFeature } from "../core/component/feature.js";
import { Component } from "../core/component/component.js";
import { ComponentCollection } from "../core/component/component-collection.js";
import { SiteComponent } from "./site.js";

export const View = (() => {
    const statuses = enumList({
        pending: "pending",
        rendering: "rendering",
    }, "viewStatuses");
    const privateMethods = {};
    const Mixin = StatusesMixin({ statuses, defaultStatus: statuses.pending, privateMethods });
    return class extends Mixin {
        #host;
        #components = new ComponentCollection;
        #main;
        #nodes;
        #changeStatus;
        constructor(host) {
            super();
            this.#changeStatus = privateMethods.changeStatus;
            this.#host = host;
        }
        get host() {
            return this.#host;
        }
        get main() {
            return this.#main;
        }
        get nodes() {
            return this.#nodes;
        }
        get components() {
            const collection = new ComponentCollection;
            collection.import(this.#components);
            return collection;
        }
        #dispatchComponentListChange() {
            this.dispatchEvent(new CustomEvent("componentlistchange", {
                detail: { components: this.components }
            }));
        }
        paint(nodes, components, main) {
            validateVarInterface(nodes, Set);
            validateVarInterface(components, ComponentCollection, { paramNumber: 2, allowUndefined: true });
            if (!this.isPending) {
                throw new DOMException("Only pending view can be rendered");
            }
            this.#nodes = nodes;
            this.#host.append(...nodes);
            this.#main = main;
            if (components && components.size !== 0) {
                this.#components.import(components);
                this.#dispatchComponentListChange();
                for (const component of components) {
                    if (component.feature instanceof DynamicFeature) {
                        if (component.feature.isPassive) {
                            component.feature.activate();
                        }
                    }
                }
            }
            this.#changeStatus(statuses.rendering);
        }
        clear() {
            if (!this.isRendering) {
                throw new DOMException("Only rendering view can be cleared");
            }
            // Remove components, before clearing up child nodes, in order to properly deactivate component features.
            this.removeAllComponents();
            for (const child of Array.from(this.#host.children)) {
                if (this.#nodes.has(child)) {
                    child.remove();
                    this.#nodes.delete(child);
                }
            }
            this.#changeStatus(statuses.pending);
        }
        getComponent(id) {
            return this.#components.get(id);
        }
        getComponentByName(name) {
            return this.#components.findFirstByProperty("name", name);
        }
        hasComponent(id) {
            return this.#components.has(id);
        }
        addComponent(component, { attachmentController } = {}) {
            validateVarInterface(component, Component);
            this.#components.add(component);
            if (attachmentController) {
                validateAttachmentController(attachmentController);
                attachmentController.host = this.#host;
                attachmentController.attach(component.element);
            }
            this.#dispatchComponentListChange();
        }
        removeComponent(id, { dispatchListChange = true } = {}) {
            const component = this.getComponent(id);
            if (component) {
                const element = component.element;
                if (this.#host.contains(element) || this.#host === element) {
                    if (component instanceof SiteComponent) {
                        const feature = component.feature;
                        if (feature instanceof DynamicFeature && feature.isActive) {
                            feature.deactivate();
                        }
                    }
                    if (element !== this.#host && !isElementRootOrBody(element)) {
                        element.remove();
                    }
                    this.#components.remove(component.id);
                    if (dispatchListChange) {
                        this.#dispatchComponentListChange();
                    }
                }
            }
        }
        removeComponentsByCategory(category) {
            const filteredCollection = this.#components.filterByProperty("category", category);
            if (filteredCollection.size !== 0) {
                for (const component of filteredCollection) {
                    this.removeComponent(component.id, { dispatchListChange: false });
                }
                this.#dispatchComponentListChange();
            }
        }
        removeAllComponents() {
            for (const component of this.#components) {
                this.removeComponent(component.id, { dispatchListChange: false });
            }
            this.#dispatchComponentListChange();
        }
    }
})();