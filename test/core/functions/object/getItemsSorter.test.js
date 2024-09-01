"use strict";

import { expect } from "chai";
import { getItemsSorter } from "../../../../src/core/functions/object.js";

describe("getItemsSorter", function() {
    it("should sort items based on quantity, then name in descending order, then type in descending order", () => {
        const items = [
            { name: "asparagus", type: "vegetables", quantity: 5 },
            { name: "bananas", type: "fruit", quantity: 0 },
            { name: "goat", type: "meat", quantity: 23 },
            { name: "cherries", type: "fruit", quantity: 5 },
            { name: "cherries", type: "sweets", quantity: 5 },
            { name: "fish", type: "meat", quantity: 22 },
        ];
        const sorter = getItemsSorter({ sortCriteria: "quantity, name DESC, type DESC" });
        items.sort(sorter);
        expect(items).to.deep.equal([
            { name: "bananas", type: "fruit", quantity: 0 },
            { name: "cherries", type: "sweets", quantity: 5 },
            { name: "cherries", type: "fruit", quantity: 5 },
            { name: "asparagus", type: "vegetables", quantity: 5 },
            { name: "fish", type: "meat", quantity: 22 },
            { name: "goat", type: "meat", quantity: 23 }
        ]);
    });
    it("should sort items by name in ascending order, accent insensitive", () => {
        const items = [
            { name: "Broccoli" },
            { name: "bananas" },
            { name: "ąžuolas" },
        ];
        const sorter = getItemsSorter({ sortCriteria: "name ASC" });
        items.sort(sorter);
        expect(items).to.deep.equal([
            { name: "ąžuolas" },
            { name: "bananas" },
            { name: "Broccoli" }
        ]);
    });
    it("should sort items by multiple criteria: name (ascending, accent insensitive), and then quantity (descending)", () => {
        const items = [
            { name: "Apple", quantity: 10 },
            { name: "banana", quantity: 5 },
            { name: "ąžuolas", quantity: 15 },
            { name: "Banana", quantity: 20 },
            { name: "apple", quantity: 5 },
            { name: "Cherries", quantity: 7 },
        ];
        const sorter = getItemsSorter({
            sortCriteria: "name ASC, quantity DESC"
        });
        items.sort(sorter);
        expect(items).to.deep.equal([
            { name: "Apple", quantity: 10 },
            { name: "apple", quantity: 5 },
            { name: "ąžuolas", quantity: 15 },
            { name: "Banana", quantity: 20 },
            { name: "banana", quantity: 5 },
            { name: "Cherries", quantity: 7 }
        ]);
    });
});