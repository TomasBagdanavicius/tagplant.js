"use string";

import { createElement } from "../../core/functions/node.js";
import { createAndDefineCustomElement, createSlottedTemplate, objectToSlottedElement } from "../../core/web-component/functions.js";
import { Template } from "../template.js";

export class CustomElementTemplate extends Template {
    #data;
    #elementName;
    constructor(data, elementName) {
        super(data);
        this.#data = data;
        this.#elementName = elementName;
        createAndDefineCustomElement(this.#elementName, {
            template: this.constructor.getHTMLTemplate()
        });
    }
    getParts() {
        const nodes = new Set;
        const elem = createElement(this.#elementName, {
            elems: [...objectToSlottedElement(this.#data).children]
        });
        nodes.add(elem);
        return { nodes };
    }
    static getHTMLTemplate() {
        return createSlottedTemplate([
            { name: "name", wrapper: createElement("p", { classes: ["name"], elems: [{ tag: "span", options: { text: "Name: " } }] }) },
        ]);
    }
}