"use strict";

import { createElement } from "../../src/core/functions/node.js";

const myElement = createElement("h1", {
    text: "Hello World!",
    classes: ["hello-world"],
});
document.body.prepend(myElement);