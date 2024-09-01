"use strict";

import { validateVarInterface } from "../core/functions/misc.js";
import { ElementRepresentative } from "../core/element/element-representative.js";
import { Component } from "../core/component/component.js";

export class ElementComponent extends Component {
    #isHTMLElement;
    constructor(element, { name } = {}) {
        validateVarInterface(element, [Element, ElementRepresentative]);
        super(element, { name });
        this.#isHTMLElement = element instanceof Element;
    }
    get isHTMLElement() {
        return this.#isHTMLElement;
    }
    get element() {
        return this.#isHTMLElement ? this.content : this.content.element;
    }
}