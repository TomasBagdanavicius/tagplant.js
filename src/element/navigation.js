"use strict";

import { createElement } from "../core/functions/node.js";
import { defaultHyperlinkBuilder } from "../core/functions/misc.js";
import { ElementRepresentative } from "../core/element/element-representative.js";
import { List } from "./list.js";

export class Navigation extends ElementRepresentative {
    #list;
    constructor(heading, classes = []) {
        const elem = createElement("nav", { classes });
        super(elem);
        this.#list = new List;
        elem.append(this.#list.element);
        if (heading) {
            elem.prepend(createElement("span", {
                text: heading,
                classes: ["heading"]
            }));
        }
    }
    get list() {
        return this.#list;
    }
    prepend(el, key) {
        return this.#list.prepend(el, key);
    }
    append(el, key) {
        return this.#list.append(el, key);
    }
    insert(el, position, key) {
        return this.#list.insert(el, position, key);
    }
    remove(key) {
        return this.#list.remove(key);
    }
    appendHyperlink(url, text, key, { hyperlinkBuilder = defaultHyperlinkBuilder } = {}) {
        const hyperlink = hyperlinkBuilder.buildHyperlink(url, text);
        const prepend = this.append(hyperlink, key);
        return [hyperlink, ...prepend];
    }
    static fromSchema(schema, { hyperlinkBuilder = defaultHyperlinkBuilder, heading = "Navigation", classes = [] } = {}) {
        const navigation = new Navigation(heading, classes);
        for (const [name, value] of Object.entries(schema)) {
            const hyperlink = hyperlinkBuilder.buildHyperlink(value.url, value.title);
            navigation.append(hyperlink, name);
        }
        return navigation;
    }
}