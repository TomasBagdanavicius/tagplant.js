"use strict";

import { notificationsCenter } from "../../src/components/site-notifications.js";

document.addEventListener("colormodechange", e => {
    const { newColorMode, oldColorMode } = e.detail;
    notificationsCenter.sendText(`Color mode changed from "${oldColorMode.value}" to "${newColorMode.value}"`, {
        broadcast: false,
        category: "colorMode"
    });
});