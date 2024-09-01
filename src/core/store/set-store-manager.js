"use strict";

import { validateVarInterface } from "../functions/misc.js";
import { collectionDeleteByKey, DeleteByKeyMixin } from "./store-manager.js";

export class SetStoreManager extends DeleteByKeyMixin(collectionDeleteByKey) {
    #dispatchAddEvent;
    constructor(set) {
        validateVarInterface(set, Set, { allowUndefined: true });
        if (!set) {
            set = new Set;
        }
        const protectedMethods = {};
        super(set, { protectedMethods });
        this.#dispatchAddEvent = protectedMethods.dispatchAddEvent;
    }
    hasKey(key) {
        return this.store.has(key);
    }
    add(element) {
        // Returns same set object
        this.store.add(element);
        this.#dispatchAddEvent(element, { position: -1 });
    }
}