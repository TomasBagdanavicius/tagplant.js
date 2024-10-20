"use strict";

import { landingDatabaseManager } from "../../var/indexed-databases.js";

export const clockIndexedDBStoreController = {
    getKeyByName(name) {
        switch (name) {
            case "state":
                return "showClock";
            case "format":
                return "clockFormat";
        }
    },
    async fetch(name, { signal } = {}) {
        const key = this.getKeyByName(name);
        const record = await landingDatabaseManager.readValue("settings", key, { signal });
        if (record) {
            return record.value;
        } else {
            return null;
        }
    },
    async save(name, value, { signal } = {}) {
        const key = this.getKeyByName(name);
        await landingDatabaseManager.saveValue("settings", key, { value }, { signal });
        return value;
    }
};