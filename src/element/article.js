"use strict";

import { headingLevels } from "../core/functions/enumeration.js";
import { createElement } from "../core/functions/node.js";
import { ElementRepresentative } from "../core/element/element-representative.js";
import { Navigation } from "./navigation.js";
import { DescriptionListPairs } from "./description-list-pairs.js";

export class Article extends ElementRepresentative {
    constructor(title, { classes = [], headingLevel = headingLevels.two, includeStory = false } = {}) {
        const refs = {};
        const [elem] = Article.createCarcass(title, { classes, headingLevel, includeStory, refs });
        super(elem);
        for (const [name, value] of Object.entries(refs)) {
            Object.defineProperty(this, name, {
                get: () => {
                    return value;
                }
            });
        }
    }
    changeTitle(title) {
        this.heading.innerText = title;
    }
    addFooter() {
        if (!this.footer) {
            const footer = createElement(...Object.values(this.constructor.getFooterSchema()));
            this.element.append(footer);
            this.footer = footer;
            return footer;
        } else {
            return this.footer;
        }
    }
    insert(element) {
        if (element instanceof ElementRepresentative) {
            element = element.element;
        }
        if (!this.footer) {
            this.element.append(element);
        } else {
            this.element.insertBefore(element, this.footer);
        }
        return element;
    }
    insertIntoStory(element) {
        if (!this.story) {
            throw new DOMException("Story component is not available");
        }
        if (element instanceof ElementRepresentative) {
            element = element.element;
        }
        this.story.append(element);
    }
    static getHeaderSchema(title, headingLevel) {
        return ElementRepresentative.getStandardHeaderSchema(title, {
            classes: ["article-header"],
            headingLevel,
            headingClasses: ["article-heading"]
        });
    }
    static getFooterSchema() {
        return ElementRepresentative.getStandardFooterSchema(["article-footer"]);
    }
    static createCarcass(title, {
        classes = [],
        attrs,
        headingLevel = headingLevels.two,
        includeFooter = false,
        includeStory = false,
        refs = {}
    } = {}) {
        const [article, updatedRefs] = ElementRepresentative.createStandardCarcass(Article, "article", title, {
            classes, attrs, headingLevel, includeFooter, refs
        });
        if (includeStory) {
            const storyElem = createElement("div", { classes: ["story"] });
            article.firstElementChild.after(storyElem);
            updatedRefs.story = storyElem;
        }
        return [article, updatedRefs];
    }
    static fromSchema(data, { hyperlinkBuilder } = {}) {
        const article = new Article(data.title);
        if ("message" in data) {
            const paragraph = createElement("p", { text: data.message });
            article.insert(paragraph);
        }
        if ("data" in data) {
            const descriptionList = new DescriptionListPairs;
            for (const [name, info] of Object.entries(data.data)) {
                if ("value" in info) {
                    descriptionList.appendPair(name, info.value, { name });
                }
            }
            if (descriptionList.element.children.length !== 0) {
                article.insert(descriptionList);
            }
        }
        if ("navigation" in data) {
            const navigation = Navigation.fromSchema(data.navigation, {
                hyperlinkBuilder,
                heading: "Article Navigation"
            });
            navigation.appendTo(article.addFooter());
        }
        return article;
    }
}