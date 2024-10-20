"use strict";

import { EventListenersController } from "../../src/core/events/event-listeners-controller.js";
import { clockFeature } from "../../src/components/clock-feature.js";
import { notificationsCenter } from "../../src/components/site-notifications.js";
import { dateTimeFormats } from "../../var/date-time-formats.js";

export const clockFeatureListeners = {
    statechange: {
        type: "statechange",
        args: [
            e => {
                const { newState, oldState } = e.detail;
                if (oldState !== undefined) {
                    let message;
                    if (newState) {
                        message = "Clock has been enabled";
                    } else {
                        message = "Clock has been disabled";
                    }
                    notificationsCenter.sendText(message, { broadcast: false, category: "clockVisibility" });
                }
            }
        ]
    },
    formatchange: {
        type: "formatchange",
        args: [
            e => {
                const { newFormat, oldFormat } = e.detail;
                if (oldFormat !== undefined) {
                    const formatInfo = dateTimeFormats[newFormat];
                    const formatter = new Intl.DateTimeFormat(document.documentElement.lang, formatInfo.options);
                    const timePreview = formatter.format(new Date);
                    notificationsCenter.sendText(`Clock format changed to "${formatInfo.title}" ${timePreview}`, { broadcast: false, category: "clockFormat" });
                }
            }
        ]
    }
}
export const controller = new EventListenersController(clockFeatureListeners, clockFeature, { autoadd: true });