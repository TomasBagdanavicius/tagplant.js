"use strict";

import { IndexedDatabase } from "../src/core/store/indexed-database.js";
import { IndexedDatabaseManager } from "../src/core/store/indexed-database-manager.js";

export const landingDatabase = new IndexedDatabase("landing", {
    "settings": {
        "name": { unique: true },
        "value": {},
    },
    "savedUsers": {
        "id": { autoIncrement: true, unique: true },
        "name": {},
        "username": { unique: true },
        "image": {},
        "timeCreated": {},
    },
}, 1);

export const landingDatabaseManager = new IndexedDatabaseManager(landingDatabase);