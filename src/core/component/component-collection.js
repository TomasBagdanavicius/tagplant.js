"use strict";

import { IDMappedCollection } from "../collections/id-mapped-collection.js";
import { Component } from "./component.js";

export class ComponentCollection extends IDMappedCollection {
    constructor() {
        super(Component);
    }
    findByContent(value) {
        return this.findFirstByProperty("content", value);
    }
}