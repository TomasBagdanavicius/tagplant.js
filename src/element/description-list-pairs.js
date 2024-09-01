"use strict";

import { createElement, insertElementAt, onChildListChange } from "../core/functions/node.js";
import { isEven, isOdd } from "../core/functions/number.js";
import { ElementRepresentative } from "../core/element/element-representative.js";

export class DescriptionListPairs extends ElementRepresentative {
    #pairs = new Map;
    #garbageBin = new WeakSet;
    constructor(classes = []) {
        const el = createElement("dl", { classes });
        super(el);
        onChildListChange(el, ({ addedNodes, removedNodes }) => {
            if (addedNodes.length) {
                let details = null;
                let restToGarbageBin = false;
                let i = 0;
                for (const addedNode of addedNodes.values()) {
                    if (!restToGarbageBin) {
                        if (addedNode.tagName !== "DT" && addedNode.tagName !== "DD") {
                            addedNode.remove();
                            console.error(`Description list cannot contain a child with tag name ${addedNode.tagName}`);
                            restToGarbageBin = true;
                        } else {
                            i++;
                            if (isOdd(i)) {
                                if (addedNode.tagName === "DT") {
                                    details = addedNode;
                                } else if (!this.getByDetails(addedNode)) {
                                    console.error("Description list pair cannot start with details");
                                    this.#garbageBin.add(addedNode);
                                    addedNode.remove();
                                    restToGarbageBin = true;
                                    continue;
                                }
                            } else if (isEven(i)) {
                                if (addedNode.tagName === "DD") {
                                    if (!this.#pairs.has(details)) {
                                        this.#pairs.set(details, { details: addedNode });
                                    }
                                    details = null;
                                } else {
                                    console.error("Description list's term cannot be followed by another term");
                                    this.#garbageBin.add(addedNode);
                                    addedNode.remove();
                                    restToGarbageBin = true;
                                    continue;
                                }
                            }
                        }
                    } else {
                        this.#garbageBin.add(addedNode);
                        addedNode.remove();
                    }
                }
                if (details !== null && !this.#pairs.has(details)) {
                    console.error("Description list's term must be followed by details");
                    this.#garbageBin.add(details);
                    details.remove();
                    details = null;
                }
            }
            if (removedNodes.length) {
                for (const removedNode of removedNodes.values()) {
                    const tagName = removedNode.tagName;
                    if (tagName === "DT" || tagName === "DD") {
                        if (!this.#garbageBin.has(removedNode)) {
                            if (tagName === "DT") {
                                if (this.#pairs.has(removedNode)) {
                                    const { details } = this.#pairs.get(removedNode);
                                    this.#pairs.delete(removedNode);
                                    this.#garbageBin.add(details);
                                    details.remove();
                                }
                            } else {
                                for (const [term, { details }] of this.#pairs.entries()) {
                                    if (details === removedNode) {
                                        this.#pairs.delete(term);
                                        this.#garbageBin.add(term);
                                        term.remove();
                                        break;
                                    }
                                }
                            }
                        } else {
                            this.#garbageBin.delete(removedNode);
                        }
                    }
                }
            }
            this.revisit();
        });
        this.revisit();
    }
    get count() {
        return this.element.children.length / 2;
    }
    revisit() {
        this.element.setAttribute("data-count", this.count);
    }
    prependPair(termText, detailsValue, { name, termClasses, detailsClasses } = {}) {
        const [term, details] = this.constructor.createPair(termText, detailsValue, {
            termClasses, detailsClasses
        });
        const value = { details };
        if (name) {
            value.name = name;
            term.dataset.name = name;
        }
        this.#pairs.set(term, value);
        this.element.prepend(term, details);
        return [term, details];
    }
    appendPair(termText, detailsValue, { name, termClasses, detailsClasses } = {}) {
        const [term, details] = this.constructor.createPair(termText, detailsValue, {
            termClasses, detailsClasses
        });
        const value = { details };
        if (name) {
            value.name = name;
            term.dataset.name = name;
        }
        this.#pairs.set(term, value);
        this.element.append(term, details);
        return [term, details];
    }
    insertPair(termText, detailsValue, position, { name, termClasses, detailsClasses } = {}) {
        const [term, details] = this.constructor.createPair(termText, detailsValue, {
            termClasses, detailsClasses
        });
        const value = { details };
        if (name) {
            value.name = name;
            term.dataset.name = name;
        }
        this.#pairs.set(term, value);
        position = position * 2;
        insertElementAt(this.element, term, position);
        insertElementAt(this.element, details, position + 1);
        return [term, details];
    }
    getByTerm(term) {
        if (this.#pairs.has(term)) {
            const { details } = this.#pairs.get(term);
            return [term, details];
        }
        return null;
    }
    getByName(name) {
        for (const [term, { name: pairName, details }] of this.#pairs.entries()) {
            if (pairName === name) {
                return [term, details];
            }
        }
        return null;
    }
    getByDetails(details) {
        for (const [term, { details: pairDetails }] of this.#pairs.entries()) {
            if (pairDetails === details) {
                return [term, details];
            }
        }
        return null;
    }
    delete(searchName) {
        for (const [term, { name, details }] of this.#pairs.entries()) {
            if (name === searchName) {
                this.#pairs.delete(term);
                term.remove();
                details.remove();
                return true;
            }
        }
        return false;
    }
    static createTerm(text, { classes } = {}) {
        return createElement("dt", { text, classes });
    }
    static createDetails(value, { classes } = {}) {
        const options = { classes };
        if (value instanceof Node) {
            options.elems = [value];
        } else {
            options.text = value;
        }
        return createElement("dd", options);
    }
    static createPair(termText, details, { termClasses, detailsClasses } = {}) {
        return [
            DescriptionListPairs.createTerm(termText, { classes: termClasses }),
            DescriptionListPairs.createDetails(details, { classes: detailsClasses })
        ];
    }
    static fromItems(items, refs, { classes = [] } = {}) {
        const list = new DescriptionListPairs(classes);
        for (const data of items) {
            if (typeof data === "object" && "title" in data && "value" in data) {
                const [term] = list.appendPair(data.title, data.value, {
                    name: data.name,
                    termClasses: data.termClasses,
                    detailsClasses: data.detailsClasses,
                });
                if ("ref" in data) {
                    refs[data.ref] = term;
                }
            }
        }
        return list;
    }
}