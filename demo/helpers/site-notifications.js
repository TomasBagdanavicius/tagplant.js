"use strict";

import { notificationsCenter } from "../../src/components/site-notifications.js";

export const siteNotificationsEl = notificationsCenter.appendToBody({
    asPopover: false,
    cancelOnClick: false,
    includeControls: false,
    id: "site-notifications",
    includeDeleteButton: false,
});