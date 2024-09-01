"use strict";

import { createElement } from "../core/functions/node.js";
import { isNullish, fillInSearachableElementValue, searchable } from "../core/functions/misc.js";
import { isNonNullObject } from "../core/functions/object.js";
import { imageElementFromURL } from "../core/functions/image.js";
import { timestampToLocalISO8601, timeAgo } from "../core/functions/date.js";
import { enabledDisabled, enumList } from "../core/functions/enumeration.js";
import { WebComponentMixin } from "../core/web-component/web-component-mixin.js";
import { createSlottedTemplate, objectToSlottedElement } from "../core/web-component/functions.js";
import { StatusesMixin } from "../core/mixins/statuses.js";
import { EventListenersController } from "../core/events/event-listeners-controller.js";
import { ArrayPairsStoreManager } from "../core/store/array-pairs-store-manager.js";
import { Article } from "../element/article.js";
import { Menu } from "../element/menu.js";
import { PagedListing } from "../element/listing/extensions/paged-listing.js";
import { StoreListing } from "../element/listing/store-listing.js";
import { userPaths } from "../../var/paths.js";

class SiteNotificationCard extends WebComponentMixin() {
    constructor() {
        super();
    }
    connectedCallback() {
        const template = this.getDefaultTemplate();
        super.connectedCallback(template);
        if (userPaths?.stylesheets?.siteNotificationCard) {
            this.addExternalStylesheet(userPaths.stylesheets.siteNotificationCard);
        }
    }
    getDefaultTemplate() {
        return createSlottedTemplate([
            "select-checkbox",
            "icon",
            "title",
            { name: "text", wrapper: createElement("p", { classes: ["text"] }), partName: "text" },
            "time",
            "menu",
            "progress",
        ]);
    }
}
customElements.define("site-notification-card", SiteNotificationCard);

export const SiteNotification = (() => {
    const statuses = enumList({
        pending: "Pending",
        active: "Active",
        passive: "Passive"
    }, "siteNotificationStatuses");
    const privateMethods = {};
    const Mixin = StatusesMixin({ statuses, defaultStatus: statuses.pending, privateMethods });
    let notificationId = 0;
    return class extends Mixin {
        #id;
        #changeStatus;
        #setStatus;
        #activationTime;
        #activationTimeoutId;
        #category;
        constructor(text, {
            title,
            iconURL,
            type = "normal",
            durationActive = 5_000,
            activationTime,
            category = "main",
            id
        } = {}) {
            super();
            this.#changeStatus = privateMethods.changeStatus;
            this.#setStatus = privateMethods.setStatus;
            if (id) {
                if (id < notificationId) {
                    throw new DOMException(`Artibral notification ID cannot be smaller than ${notificationId}`);
                }
                notificationId = id;
            } else {
                notificationId++;
            }
            this.#id = notificationId;
            this.text = text;
            this.title = title;
            this.iconURL = iconURL;
            this.type = type;
            this.durationActive = durationActive;
            this.#category = category;
            if (!isNullish(activationTime)) {
                this.#activationTime = activationTime;
                const expiryTime = activationTime + durationActive;
                const isValid = expiryTime > Date.now();
                if (isValid) {
                    const timeRemaining = expiryTime - Date.now();
                    this.#setStatus(statuses.active);
                    this.#activationTimeout(timeRemaining, durationActive);
                } else {
                    this.#setStatus(statuses.passive);
                }
                this.#activationTime = activationTime;
            }
        }
        get id() {
            return this.#id;
        }
        get keyPath() {
            return "id";
        }
        static get statuses() {
            return statuses;
        }
        get activationTime() {
            return this.#activationTime;
        }
        get category() {
            return this.#category;
        }
        async #activationTimeout(timeout, duration = 5_000) {
            if (timeout <= 0) {
                return;
            }
            const dispatchProgress = progress => {
                this.dispatchEvent(new CustomEvent("progress", {
                    detail: { progress }
                }));
            }
            const progressHandler = normalizedProgress => {
                const elapsedTime = Date.now() - this.#activationTime;
                const progress = (elapsedTime / duration) * 100;
                if (!normalizedProgress) {
                    normalizedProgress = Math.floor(progress);
                }
                dispatchProgress(normalizedProgress);
                const nextProgress = normalizedProgress + 1;
                const remainingProgress = nextProgress - progress;
                const remainingTime = (remainingProgress / 100) * duration;
                this.#activationTimeoutId = setTimeout(() => {
                    if (nextProgress !== 100) {
                        progressHandler(nextProgress);
                    } else {
                        this.#changeStatus(statuses.passive);
                        dispatchProgress(100);
                        return this.status;
                    }
                }, remainingTime);
            }
            progressHandler();
        }
        activate(duration) {
            if (!this.isPending) {
                throw new DOMException("Only pending notification can be activated");
            }
            this.#changeStatus(statuses.active);
            this.#activationTime = Date.now();
            duration = duration || this.duration;
            this.#activationTimeout(duration, duration);
        }
        cancel() {
            if (!this.isActive) {
                throw new DOMException("Only active notification can be cancelled");
            }
            clearTimeout(this.#activationTimeoutId);
            this.#changeStatus(statuses.passive);
        }
        createWebComponent({ search } = {}) {
            const refs = {};
            const component = objectToSlottedElement({
                title: this.title,
                text: this.text,
                time: () => {
                    if (!this.#activationTime) {
                        return null;
                    }
                    const timestamp = this.#activationTime;
                    const el = createElement("time", {
                        attrs: {
                            datetime: timestampToLocalISO8601(timestamp)
                        }
                    });
                    timeAgo(new Date(timestamp), el);
                    return el;
                },
                icon: () => {
                    if (this.iconURL) {
                        return imageElementFromURL(this.iconURL, "Icon");
                    }
                },
                type: this.type
            }, { tag: "site-notification-card", refs });
            if (refs.title) {
                refs.title.classList.add("title");
            }
            refs.text.classList.add("text");
            const menu = new Menu({ headingText: "Options", host: component });
            menu.element.setAttribute("slot", "menu");
            let cancelButton;
            if (!this.isPassive) {
                ([, , cancelButton] = menu.appendButton("Cancel", "cancel", {
                    classes: ["cancel-button"]
                }));
            }
            searchable(this.text, search, refs.text);
            searchable(this.title, search, refs.title);
            component.addEventListener("connected", () => {
                if (cancelButton) {
                    cancelButton.addEventListener("click", () => {
                        if (this.isActive) {
                            this.cancel();
                        }
                    });
                    this.addEventListener("statuschange", e => {
                        if (e.detail.newStatus === statuses.passive) {
                            menu.remove("cancel");
                        }
                    });
                }
                component.setAttribute("data-type", this.type);
                menu.appendTo(component);
                let progressValue;
                if (this.isPending) {
                    progressValue = 0;
                } else if (this.isPassive) {
                    progressValue = 100;
                }
                const progressElem = createElement("div", {
                    classes: ["progress-container"],
                    attrs: {
                        slot: "progress",
                    },
                    elems: [{
                        tag: "progress",
                        options: {
                            attrs: {
                                max: 100,
                                value: progressValue || 0,
                            },
                        },
                        ref: "progress",
                    }]
                }, refs);
                this.addEventListener("progress", e => {
                    const { progress } = e.detail;
                    refs.progress.value = progress;
                });
                component.append(progressElem);
            });
            component._menu = menu;
            return component;
        }
        toElement({ search } = {}) {
            return this.createWebComponent({ search });
        }
        toGroupMember({ search } = {}) {
            return this.toElement({ search });
        }
        getFormattedActivationTime() {
            const formatter = new Intl.DateTimeFormat(document.documentElement.lang, {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
                hour12: false,
            });
            return formatter.format(new Date(this.#activationTime));
        }
        toItem() {
            return {
                id: this.#id,
                text: this.text,
                title: this.title,
                type: this.type,
                iconURL: this.iconURL,
                status: this.status.value,
                durationActive: this.durationActive,
                activationTime: this.getFormattedActivationTime(),
            };
        }
        toPrimitiveObject() {
            const data = {
                id: this.#id,
                text: this.text,
                title: this.title,
                status: this.status.name,
                iconURL: this.iconURL,
                type: this.type,
                durationActive: this.durationActive
            };
            if (this.#activationTime) {
                data.activationTime = this.#activationTime;
            }
            return data;
        }
        toElementChunks({ search, chunkList } = {}) {
            const chunkElems = {
                id: elem => {
                    const text = "#".concat(this.id);
                    fillInSearachableElementValue(elem, text, search);
                },
                text: elem => {
                    fillInSearachableElementValue(elem, this.text, search);
                },
                title: elem => {
                    fillInSearachableElementValue(elem, this.title, search);
                },
                status: elem => {
                    this.addStatusAttrTo(elem);
                    this.updateStatusText(elem, search);
                },
                iconURL: elem => {
                    fillInSearachableElementValue(elem, this.iconURL, search);
                },
                type: elem => {
                    fillInSearachableElementValue(elem, this.type, search);
                },
                durationActive: elem => {
                    const value = String(this.durationActive);
                    fillInSearachableElementValue(elem, value.concat(" ms"), search, value);
                },
                activationTime: elem => {
                    fillInSearachableElementValue(elem, this.getFormattedActivationTime(), search);
                },
                options: () => {
                    // Normally this is populated with custom menu manually.
                }
            }
            if (isNonNullObject(chunkList)) {
                const result = {};
                for (const chunkName of Object.keys(chunkList)) {
                    if (Object.hasOwn(chunkElems, chunkName)) {
                        result[chunkName] = chunkElems[chunkName];
                    }
                }
                return result;
            } else {
                return chunkElems;
            }
        }
        static get chunkNames() {
            return {
                id: "ID",
                text: "Text",
                title: "Title",
                status: "Status",
                iconURL: "Icon URL",
                type: "Type",
                durationActive: "Duration",
                activationTime: "Activation Time",
                options: "Options",
            };
        }
        static get sortValues() {
            return {
                id: "ID",
                text: "Text",
                title: "Title",
                status: "Status",
                type: "Type",
                durationActive: "Duration",
            }
        }
        static fromPrimitiveObject(params) {
            params = Object.assign({}, params);
            const { text } = params;
            delete params.text;
            delete params.status;
            return new SiteNotification(text, params);
        }
    }
})();

export class NotificationsCenter extends EventTarget {
    #store = new ArrayPairsStoreManager;
    #storeActiveOnly = new ArrayPairsStoreManager;
    #totalSent = 0;
    #broadcasting;
    #broadcastChannelName;
    #groupMatch;
    constructor({ broadcastChannelName = false, initialItems = [], groupMatch } = {}) {
        super();
        this.#groupMatch = groupMatch;
        if (typeof broadcastChannelName === "string" && broadcastChannelName) {
            this.#broadcasting = new BroadcastChannel(broadcastChannelName);
            this.#broadcasting.addEventListener("message", e => {
                const notification = SiteNotification.fromPrimitiveObject(e.data);
                this.#send(notification, { durationActive: e.data.durationActive, broadcast: false });
                this.dispatchEvent(new CustomEvent("broadcasted", {
                    detail: { notification, durationActive: e.data.durationActive }
                }));
            });
        }
        if (initialItems.length !== 0) {
            this.#importFromItems(initialItems);
        }
        const dispatchDeleteEvent = ids => {
            this.dispatchEvent(new CustomEvent("delete", {
                detail: { notificationIds: ids }
            }));
        }
        this.#broadcastChannelName = broadcastChannelName;
        this.#store.addEventListener("delete", e => {
            this.#storeActiveOnly.delete(e.detail.key);
            dispatchDeleteEvent([e.detail.key]);
        });
        this.#store.addEventListener("deletemany", e => {
            this.#storeActiveOnly.deleteMany(e.detail.keys);
            dispatchDeleteEvent(e.detail.keys);
        });
        this.#storeActiveOnly.addEventListener("delete", e => {
            if (e.detail.reason !== "deactivated") {
                this.#store.delete(e.detail.key);
                dispatchDeleteEvent([e.detail.key]);
            }
        });
        this.#storeActiveOnly.addEventListener("deletemany", e => {
            if (e.detail.reason !== "deactivated") {
                this.#store.deleteMany(e.detail.keys);
                dispatchDeleteEvent(e.detail.keys);
            }
        });
    }
    get size() {
        return this.#store.size;
    }
    get totalSent() {
        return this.#totalSent;
    }
    get broadcastChannelName() {
        return this.#broadcastChannelName;
    }
    toMap({ reversed = true } = {}) {
        let data = this.#store.store;
        // The default dataset is considered reversed
        if (!reversed) {
            data = this.#store.store.toReversed();
        }
        return new Map(data);
    }
    #importFromItems(items) {
        for (const data of items) {
            const notification = SiteNotification.fromPrimitiveObject(data);
            this.#addToStores(notification);
        }
    }
    #addToStores(notification) {
        this.#store.add(notification, notification.id, { position: 0 });
        const addActive = () => {
            this.#storeActiveOnly.add(notification, notification.id, { position: 0 });
            notification.addEventListener("statuschange", e => {
                if (e.detail.newStatus === notification.statuses.passive) {
                    this.#storeActiveOnly.delete(notification.id, { reason: "deactivated" });
                }
            });
        }
        if (notification.isPending) {
            notification.addEventListener("statuschange", e => {
                if (e.detail.newStatus === notification.statuses.active) {
                    addActive();
                }
            });
        }
        if (notification.isActive) {
            addActive();
        }
    }
    #send(notification, { durationActive = 5_000, broadcast = false } = {}) {
        notification.activate(durationActive);
        // Cancel all other notifications assigned to the same group
        if (
            this.#groupMatch === "cancel"
            && notification.category
            && notification.category !== "main"
        ) {
            for (const [, storedNotification] of this.#store) {
                if (
                    storedNotification !== notification
                    && notification.category === storedNotification.category
                    && storedNotification.isActive
                ) {
                    storedNotification.cancel();
                }
            }
        }
        this.#addToStores(notification);
        this.#totalSent++;
        this.dispatchEvent(new CustomEvent("send", {
            detail: { notification }
        }));
        if (broadcast && this.#broadcasting) {
            // Must be structured clone algorithm compatible
            const data = notification.toPrimitiveObject();
            delete data.activationTime;
            delete data.status;
            this.#broadcasting.postMessage(data);
        }
    }
    #sendParams(text, { title, iconURL, type, durationActive, broadcast = false, category } = {}) {
        const notification = new SiteNotification(text, {
            title, iconURL, type, category, durationActive
        });
        this.#send(notification, { durationActive, broadcast });
    }
    #sendText(text, { broadcast = false, category } = {}) {
        this.#send(new SiteNotification(text, { category }), { broadcast });
    }
    toComponents({
        id,
        cancelOnClick = false,
        hideOnCancel = true,
        includeDeleteButton = true,
        includeControls = true,
        includeListingManager = false,
        classes = ["notifications-center"],
        customListingOptions,
    } = {}) {
        const article = new Article("Notifications Center", { classes });
        if (id) {
            article.element.id = id;
        }
        const listing = this.releaseListing({
            cancelOnClick,
            hideOnCancel,
            includeDeleteButton,
            includeControls,
            includeListingManager,
            customOptions: customListingOptions,
        });
        article.insert(listing);
        return [article, listing];
    }
    toElementRepresentative({
        id,
        cancelOnClick = false,
        hideOnCancel = true,
        includeDeleteButton = true,
        includeControls = true,
        includeListingManager = false,
        classes,
        customListingOptions,
    } = {}) {
        const [article] = this.toComponents({
            id, cancelOnClick, hideOnCancel, includeDeleteButton, includeControls, includeListingManager, classes, customListingOptions
        });
        return article;
    }
    toElement({
        id,
        cancelOnClick = false,
        hideOnCancel = true,
        includeDeleteButton = true,
        includeControls = true,
        includeListingManager = false,
        classes,
        customListingOptions,
    } = {}) {
        return this.toElementRepresentative({
            id, cancelOnClick, hideOnCancel, includeDeleteButton, includeControls, includeListingManager, classes, customListingOptions
        }).element;
    }
    releaseListing({
        cancelOnClick = false,
        hideOnCancel = true,
        includeDeleteButton = true,
        includeControls = true,
        includeListingManager = false,
        customOptions,
    } = {}) {
        const store = hideOnCancel ? this.#storeActiveOnly : this.#store;
        const options = {
            ...customOptions,
            keyAsDataId: true,
            searchable: !!includeControls,
            includeMeta: !!includeControls,
            paging: includeControls ? PagedListing.pagingMethods.regular : false,
            createMenuForEachItem: true,
            itemBindings: ({ item, element: notification, controls }) => {
                const { deleteController, releaseMenu } = controls;
                if (includeDeleteButton) {
                    // eg. web component
                    if (item._menu) {
                        item._menu.append(deleteController.button, "delete");
                    // regular item
                    } else {
                        const menu = releaseMenu({ exclude: ["edit", "visit"] });
                        const optionsCell = item.querySelector(`:scope > [data-name="options"]`);
                        if (optionsCell) {
                            menu.appendTo(optionsCell);
                        }
                    }
                }
                if (cancelOnClick) {
                    item.addEventListener("click", () => {
                        if (notification.isActive) {
                            notification.cancel();
                        }
                    });
                }
                if (typeof customOptions === "object" && Object.hasOwn(customOptions, "itemBindings")) {
                    customOptions.itemBindings({ item, element: notification, controls });
                }
            },
            deleteEntriesMessages: {
                confirm: {
                    one: ({ originalElement: notification }) => {
                        return `Do you really want to delete "${notification.text.rawValue || notification.text}" from notification list?`;
                    }
                }
            }
        };
        const listing = new StoreListing(store, "Notifications", options);
        if (includeListingManager) {
            const menu = new Menu({ headingText: "Options", host: listing.footer });
            const managerButton = listing.releaseCopyManagerLaunchButton();
            menu.append(managerButton, "manageListing");
            menu.appendTo(listing.footer);
        }
        return listing;
    }
    sendText(text, { broadcast = false, category } = {}) {
        this.#sendText(text, { broadcast, category });
    }
    sendParams(text, { title, iconURL, type, durationActive, broadcast, category = "main" } = {}) {
        this.#sendParams(text, { title, iconURL, type, durationActive, broadcast, category });
    }
    appendToBody({
        asPopover = false,
        id,
        cancelOnClick = false,
        hideOnCancel = true,
        doc = document,
        includeDeleteButton = true,
        includeControls = true,
        includeListingManager = false,
        classes,
        customListingOptions,
    } = {}) {
        const elem = this.toElement({
            id, cancelOnClick, hideOnCancel, includeDeleteButton, includeControls, includeListingManager, classes, customListingOptions
        });
        doc.body.append(elem);
        if (asPopover) {
            elem.setAttribute("popover", "manual");
            elem.showPopover();
        }
        return elem;
    }
}

export const NotificationsCenterSessionStoreHandler = (() => {
    const statuses = enabledDisabled;
    const privateMethods = {};
    const Mixin = StatusesMixin({ statuses, defaultStatus: statuses.disabled, privateMethods });
    return class extends Mixin {
        #notificationsCenter;
        #storeName;
        #changeStatus;
        #listenersController;
        #limit;
        constructor(notificationsCenter, storeName, { limit = 2_000 } = {}) {
            super();
            this.#notificationsCenter = notificationsCenter;
            this.#storeName = storeName;
            this.#changeStatus = privateMethods.changeStatus;
            this.#limit = limit;
        }
        get notificationsCenter() {
            return this.#notificationsCenter;
        }
        get storeName() {
            return this.#storeName;
        }
        get rawData() {
            return sessionStorage.getItem(this.#storeName);
        }
        get data() {
            const rawData = this.rawData;
            if (rawData !== null) {
                return JSON.parse(rawData);
            } else {
                return [];
            }
        }
        #write(data) {
            let hasQuotaError;
            do {
                try {
                    sessionStorage.setItem(this.#storeName, JSON.stringify(data));
                    hasQuotaError = false;
                } catch (error) {
                    if (error instanceof DOMException && error.name === "QuotaExceededError") {
                        hasQuotaError = true;
                        data.shift();
                    }
                }
            } while (hasQuotaError);
        }
        #put(notification) {
            let data = this.data;
            if (this.#limit && this.#limit <= data.length) {
                // +1 to make room for the new notification below
                const diff = data.length - this.#limit + 1;
                data.splice(0, diff);
            }
            const notificationData = notification.toPrimitiveObject();
            data.push(notificationData);
            this.#write(data);
        }
        enable() {
            if (!this.isDisabled) {
                throw new DOMException("Only disabled notifications center store handler can be enabled");
            }
            const listeners = {
                send: {
                    type: "send",
                    args: [e => {
                        const { notification } = e.detail;
                        this.#put(notification);
                    }],
                },
                delete: {
                    type: "delete",
                    args: [e => {
                        this.delete(e.detail.notificationIds);
                    }],
                }
            };
            this.#listenersController = new EventListenersController(listeners, this.#notificationsCenter);
            this.#listenersController.add();
            this.#changeStatus(statuses.enabled);
        }
        disable() {
            if (!this.isEnabled) {
                throw new DOMException("Only enabled notifications center store handler can be disabled");
            }
            this.#listenersController.remove();
            this.#changeStatus(statuses.disabled);
        }
        clear({ removeStore = false } = {}) {
            if (removeStore) {
                sessionStorage.removeItem(this.#storeName);
            } else {
                sessionStorage.setItem(this.#storeName, []);
            }
        }
        delete(ids) {
            const data = this.data;
            for (const [index, item] of data.entries()) {
                if (ids.includes(item.id)) {
                    data.splice(index, 1);
                }
            }
            this.#write(data);
        }
        has(id) {
            const data = this.data;
            for (const item of data) {
                if (item.id === id) {
                    return true;
                }
            }
            return false;
        }
        get(id) {
            const data = this.data;
            for (const item of data) {
                if (item.id === id) {
                    return item;
                }
            }
            return null;
        }
        static fetchItems(storeName) {
            const result = sessionStorage.getItem(storeName);
            if (result === null) {
                return [];
            }
            return JSON.parse(result);
        }
    }
})();

export const notificationsCenter = new NotificationsCenter({
    broadcastChannelName: "notificationsCenter",
    groupMatch: "cancel",
});