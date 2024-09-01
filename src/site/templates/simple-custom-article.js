"use strict";

import { createElement } from "../../core/functions/node.js";
import { Article } from "../../element/article.js";
import { Template } from "../../site/template.js";

export class SimpleCustomArticleTemplate extends Template {
    constructor(data) {
        super(data);
    }
    getParts() {
        const nodes = new Set;
        const article = this.buildArticle();
        nodes.add(article.element);
        return { nodes };
    }
    buildArticle() {
        const article = new Article(this.data.title, { includeStory: true });
        article.insertIntoStory(createElement("p", { text: this.data.message }));
        return article;
    }
    buildElementRepresentative() {
        return this.buildArticle();
    }
}