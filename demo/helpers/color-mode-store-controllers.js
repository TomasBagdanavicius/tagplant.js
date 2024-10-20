"use strict";

import { httpMethods, validateEnumMember } from "../../src/core/functions/enumeration.js";
import { landingDatabaseManager } from "../../var/indexed-databases.js";
import { colorMode } from "../../src/components/color-mode.js";
import { networkRequest } from "../../src/process/network-request.js";

export const colorModeIndexedDBStoreController = {
    name: "IndexedDBStoreController",
    async fetch({ signal } = {}) {
        const record = await landingDatabaseManager.readValue("settings", "colorMode", { signal });
        if (record) {
            return colorMode.colorModes[record.value];
        } else {
            return null;
        }
    },
    async save(value, { signal } = {}) {
        validateEnumMember(value, "colorModes");
        return await landingDatabaseManager.saveValue("settings", "colorMode", { value: value.name }, { signal });
    }
}

export const colorModeAPIController = {
    name: "APIController",
    async fetch() {
        const cancelablePromise = networkRequest(this.fetchURL, new AbortController);
        const result = await cancelablePromise;
        return colorMode.colorModes[result];
    },
    async save(value) {
        validateEnumMember(value, "colorModes");
        const body = new FormData;
        body.append("value", value.name);
        const cancelablePromise = networkRequest(this.saveURL, new AbortController, {
            method: httpMethods.post,
            requestOptions: {
                body,
            }
        });
        const result = await cancelablePromise;
        return colorMode.colorModes[result];
    }
}