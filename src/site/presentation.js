"use strict";

import { validateVarInterface, issueHookEvent } from "../core/functions/misc.js";
import { enumList } from "../core/functions/enumeration.js";
import { StatusesMixin } from "../core/mixins/statuses.js";
import { IDMappedCollection } from "../core/collections/id-mapped-collection.js";
import { ElementRepresentative } from "../core/element/element-representative.js";
import { Component } from "../core/component/component.js";
import { Feature } from "../core/component/feature.js";
import { Form } from "../element/form/form.js";
import { CustomFormElementsBuilder } from "../element/form/custom-form-elements-builder.js";
import { Group } from "../element/group.js";
import { Article } from "../element/article.js";
import { ApiListing } from "../element/listing/api-listing.js";
import { Template } from "./template.js";
import { View } from "./view.js";
import { Site, SiteComponent } from "./site.js";
import { formMap, formElementMap } from "../../var/form-schema-maps.js";

export function getSiteGenericApiListingOptions() {
    return {
        groupMemberBuilder: Group.chunkBuilder,
        hyperlinkBuilder: Site.getHyperlinkBuilder(),
        itemBindings: ({ item, key, element, listing }) => {
            // Chunked or categorized.
            let titleBlock = item.querySelector(`[data-name="title"]`);
            if (titleBlock === null) {
                // Web component type.
                titleBlock = item.querySelector(`[slot="title"]`);
            }
            // Replace with visit hyperlink
            if (titleBlock) {
                const originalContent = titleBlock.innerHTML;
                const visitHyperlink = listing.createVisitHyperlink(key, element, { content: originalContent });
                titleBlock.replaceChildren(visitHyperlink);
            }
        },
        publishToURLQuery: Site.getURLQueryParamsPublisher(),
    };
}

/* Functions */

export function schemaToElementRepresentative_(data) {
    const elementRepresentative = issueHookEvent("beforeschematoelementrepresentative", { data }, "elementRepresentative", ElementRepresentative);
    if (elementRepresentative) {
        return elementRepresentative;
    }
    switch (data.presentation) {
        case "form":
            return Form.from(data, formMap, formElementMap, {
                hyperlinkBuilder: Site.getHyperlinkBuilder(),
                formElementBuilder: new CustomFormElementsBuilder,
            });
        case "listing":
            return new ApiListing(data.title, data, {
                ...getSiteGenericApiListingOptions()
            });
        case "article":
            return Article.fromSchema(data, { hyperlinkBuilder: Site.getHyperlinkBuilder() });
        default:
            console.error(`Unrecognized presentation type ${data.presentation}`);
    }
}

export function schemaToElementRepresentative(data) {
    let elementRepresentative = issueHookEvent("beforeschematoelementrepresentative", { data }, "elementRepresentative", ElementRepresentative);
    if (elementRepresentative) {
        return elementRepresentative;
    }
    switch (data.presentation) {
        case "form":
            elementRepresentative = Form.from(data, formMap, formElementMap, {
                hyperlinkBuilder: Site.getHyperlinkBuilder(),
                formElementBuilder: new CustomFormElementsBuilder,
            });
        break;
        case "listing":
            elementRepresentative = new ApiListing(data.title, data, {
                ...getSiteGenericApiListingOptions()
            });
        break;
        case "article":
            elementRepresentative = Article.fromSchema(data, { hyperlinkBuilder: Site.getHyperlinkBuilder() });
        break;
        default:
            console.error(`Unrecognized presentation type ${data.presentation}`);
    }
    issueHookEvent("afterschematoelementrepresentative", { elementRepresentative });
    return elementRepresentative;
}

/* Main */

export const Presentation = (() => {
    let presentationId = 0;
    const statuses = enumList({
        pending: "pending",
        started: "started",
        ending: "ending",
        ended: "ended"
    }, "presentationStatuses");
    const privateMethods = {};
    const Mixin = StatusesMixin({ statuses, defaultStatus: statuses.pending, privateMethods });
    return class extends Mixin {
        #id;
        #changeStatus;
        #document;
        #host;
        #template;
        #mainComponent;
        #docEventsController;
        #view;
        constructor(document, template, { host = document.body } = {}) {
            validateVarInterface(document, Document);
            validateVarInterface(template, Template);
            super();
            this.#changeStatus = privateMethods.changeStatus;
            presentationId++;
            this.#id = presentationId;
            this.#document = document;
            this.#template = template;
            this.#host = host;
        }
        get id() {
            return this.#id;
        }
        get document() {
            return this.#document;
        }
        get template() {
            return this.#template;
        }
        get view() {
            return this.#view;
        }
        get mainComponent() {
            return this.#mainComponent;
        }
        buildComponentFromData(data) {
            issueHookEvent("beforemaincomponent", { data }, "component", SiteComponent);
            const elementRepresentative = schemaToElementRepresentative(data);
            const name = Object.hasOwn(data, "page_name") ? data.page_name : "main";
            const feature = new Feature(elementRepresentative, name);
            const component = new SiteComponent(feature, { name });
            return component;
        }
        setMainData(data, { origin } = {}) {
            const component = this.buildComponentFromData(data);
            const oldComponent = this.#mainComponent;
            this.#mainComponent = component;
            this.dispatchEvent(new CustomEvent("mainchange", {
                detail: { newComponent: component, oldComponent, fromData: data, origin }
            }));
            return component;
        }
        setMainComponent(component, data, { origin } = {}) {
            validateVarInterface(component, Component);
            const oldComponent = this.#mainComponent;
            this.#mainComponent = component;
            this.dispatchEvent(new CustomEvent("mainchange", {
                detail: { newComponent: component, oldComponent, fromData: data, origin }
            }));
        }
        start(source, { origin } = {}) {
            if (!this.isPending) {
                throw new DOMException("Only pending presentation can be started");
            }
            if ("bindEvents" in this.#template) {
                this.#docEventsController = this.#template.bindEvents(this.#document);
            }
            this.#view = new View(this.#host);
            const { nodes, components, main } = this.#template.getParts();
            this.#view.paint(nodes, components, main);
            const handleMainComponent = (component, fromData, { origin } = {}) => {
                this.#view.addComponent(component);
                this.#view.main.append(component.element);
                if (fromData && "addComponentsByPageName" in this.#template) {
                    this.#template.addComponentsByPageName(fromData.name, this.#view, { origin });
                }
            }
            if (this.#mainComponent) {
                handleMainComponent(this.#mainComponent, source, { origin });
            }
            const resultComponents = this.#view.components;
            this.addEventListener("mainchange", e => {
                const { newComponent, oldComponent, fromData, origin } = e.detail;
                if (oldComponent) {
                    this.#view.removeComponent(oldComponent.id);
                    this.#view.removeComponentsByCategory(SiteComponent.categories.page);
                }
                this.#view.main.replaceChildren();
                handleMainComponent(newComponent, fromData, { origin });
            });
            this.#changeStatus(statuses.started);
            return resultComponents;
        }
        end() {
            if (!this.isStarted) {
                throw new DOMException("Only started presentation can be ended");
            }
            this.#changeStatus(statuses.ending);
            if (this.#docEventsController) {
                this.#docEventsController.remove();
            }
            this.#view.clear();
            this.#view = undefined;
            this.#changeStatus(statuses.pending);
        }
    }
})();

export class PresentationCollection extends IDMappedCollection {
    constructor() {
        super(Presentation);
    }
}