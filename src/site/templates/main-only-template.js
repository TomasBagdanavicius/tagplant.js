"use strict";

import { createElement } from "../../core/functions/node.js";
import { Template } from "../template.js";

export class MainOnlyTemplate extends Template {
    constructor() {
        super();
    }
    getParts() {
        const nodes = new Set;
        const main = createElement("main");
        nodes.add(main);
        return { nodes, main };
    }
}