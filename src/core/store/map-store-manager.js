"use strict";

import { validateVarInterface } from "../functions/misc.js";
import { DeleteByKeyMixin, collectionDeleteByKey } from "./store-manager.js";

export class MapStoreManager extends DeleteByKeyMixin(collectionDeleteByKey) {
    #dispatchAddEvent;
    constructor(map) {
        validateVarInterface(map, Map, { allowUndefined: true });
        if (!map) {
            map = new Map;
        }
        const protectedMethods = {};
        super(map, { protectedMethods });
        this.#dispatchAddEvent = protectedMethods.dispatchAddEvent;
    }
    hasKey(key) {
        return this.store.has(key);
    }
    add(element, key) {
        // Returns same map object
        this.store.set(key, element);
        this.#dispatchAddEvent(element, { key, position: -1 });
    }
}