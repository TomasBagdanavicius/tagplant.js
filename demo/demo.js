"use strict";

import { createElement } from "../src/core/functions/node.js";
import { Menu } from "../src/element/menu.js";
import { colorMode } from "../src/components/color-mode.js";

const settingsBar = createElement("div", { classes: ["demo-settings-bar"] });
settingsBar.prepend(colorMode.releaseMenu({ type: Menu.types.regular }).element);
const storeController = colorMode.defaultLocalStorageStoreController;
storeController.key = "demoColorMode";
colorMode.setCustomStoreController(storeController, { apply: true });
document.body.append(settingsBar);