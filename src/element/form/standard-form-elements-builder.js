"use strict";

import { createElement, createLabel, insertElementAt } from "../../core/functions/node.js";
import { isNonNullObject } from "../../core/functions/object.js";
import { FormElementsBuilder } from "./form-elements-builder.js";
import { Form } from "./form.js";

export class StandardFormElementsBuilder extends FormElementsBuilder {
    static #supportsPlaceholder = ["text", "search", "url", "tel", "email", "number", "password", "textarea"];
    constructor() {
        super();
    }
    static createSelectBuilder(name, { options, id, classes } = {}) {
        const element = createElement("select", {
            classes,
            id,
            attrs: { name }
        });
        const groups = new Map;
        const builder = {
            get element() {
                return element;
            },
            createGroup(label) {
                const groupElem = createElement("optgroup", { attrs: { label } });
                groups.set(label, groupElem);
                element.appendChild(groupElem);
                return builder;
            },
            addOption(name, title, { group, position } = {}) {
                const optionElem = createElement("option", { text: title, attrs: { value: name } });
                if (group && groups.has(group)) {
                    const groupElem = groups.get(group);
                    insertElementAt(groupElem, optionElem, position);
                } else {
                    insertElementAt(element, optionElem, position);
                }
                return builder;
            },
        }
        if (isNonNullObject(options)) {
            for (const [name, value] of Object.entries(options)) {
                builder.addOption(name, value);
            }
        }
        return builder;
    }
    createElements(name, config, formId) {
        const type = this.convertType(config.genericType, config);
        let tagName = "input";
        const attrs = { name };
        const options = {}
        if (formId) {
            options.id = Form.buildIdFromName(name, formId);
        }
        let label;
        if (config.title) {
            label = createLabel(config.title, options.id);
            if (StandardFormElementsBuilder.supportsPlaceholder(type)) {
                attrs.placeholder = config.title;
            }
        }
        let element;
        const create = () => {
            options.attrs = attrs;
            element = createElement(tagName, options);
            return element;
        }
        switch (type) {
            case "textarea":
                tagName = "textarea";
                break;
            case "select": {
                const builder = StandardFormElementsBuilder.createSelectBuilder(name, { options: config.set, id: options.id });
                element = builder.element;
                break;
            }
            default:
                attrs.type = type;
                break;
        }
        if (!element) {
            element = create();
        }
        if ("value" in config && typeof config.value === "string") {
            element.value = config.value;
        }
        return { element, label };
    }
    createFormElement(name, config, formId) {
        const { element } = this.createElements(name, config, formId);
        return element;
    }
    getWrapperContent(type, elements) {
        let elems;
        if (type !== "checkbox") {
            elems = [elements.label, elements.element];
        } else {
            elements.label.prepend(elements.element);
            elems = [elements.label];
        }
        return elems;
    }
    getFragment(name, config, formId) {
        const fragment = new DocumentFragment;
        const type = this.convertType(config.genericType, config);
        const elements = this.createElements(name, config, formId);
        fragment.append(...this.getWrapperContent(type, elements));
        return fragment;
    }
    wrap(type, elements) {
        const elems = this.getWrapperContent(type, elements);
        return createElement("div", { elems });
    }
    getWrapperElements(name, config, formId) {
        const elements = this.createElements(name, config, formId);
        const type = this.convertType(config.genericType, config);
        const wrapper = this.wrap(type, elements);
        return { wrapper, ...elements };
    }
    static supportsPlaceholder(type) {
        return StandardFormElementsBuilder.#supportsPlaceholder.includes(type);
    }
}