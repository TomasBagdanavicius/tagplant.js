"use strict";

import { isSubPrototypeOf } from "../functions/misc.js";
import { EventController } from "./event-controller.js";

export const eventControllersRegistry = (() => {
    const controllers = new Map;
    const consumptionIndex = new Map;
    const exposure = {
        register(controller) {
            if (!isSubPrototypeOf(controller.prototype, EventController.prototype)) {
                throw new TypeError("Invalid controller");
            }
            if (!this.has(controller.eventType)) {
                controllers.set(controller.eventType, controller);
            }
        },
        has(eventType) {
            return controllers.has(eventType);
        },
        enable(eventType, elem, args = []) {
            let setupController = false;
            let info;
            if (!consumptionIndex.has(elem)) {
                info = {};
                info[eventType] = { usageCount: 1 };
                setupController = true;
            } else {
                info = consumptionIndex.get(elem);
                if (!Object.hasOwn(info, eventType)) {
                    info[eventType] = { usageCount: 1 };
                    setupController = true;
                } else {
                    info[eventType].usageCount++;
                }
            }
            if (setupController) {
                const controller = controllers.get(eventType);
                info[eventType].controller = new controller(elem, ...args);
            }
            consumptionIndex.set(elem, info);
        },
        disable(eventType, elem) {
            if (consumptionIndex.has(elem)) {
                const info = consumptionIndex.get(elem);
                if (Object.hasOwn(info, eventType)) {
                    const eventTypeInfo = info[eventType];
                    if (eventTypeInfo.usageCount === 1) {
                        eventTypeInfo.controller.remove();
                        delete info[eventType];
                        if (!Object.values(info).length) {
                            consumptionIndex.delete(elem);
                        }
                    }
                }
            }
        },
        list() {
            return Array.from(controllers.keys());
        },
        listElementEventTypes(elem) {
            if (consumptionIndex.has(elem)) {
                return Array.from(Object.keys(consumptionIndex.get(elem)));
            } else {
                return [];
            }
        }
    };
    Object.freeze(exposure);
    return exposure;
})();