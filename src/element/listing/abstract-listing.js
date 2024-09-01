"use strict";

import { createElement, insertAfter, detachElement, isElementAttached, removeClasses, createSimpleButton, insertAdjacentNode } from "../../core/functions/node.js";
import { StringTemplate, stringTemplate, camelCaseToKebabCase } from "../../core/functions/string.js";
import { arrayElementRemove, twoArraysEqual } from "../../core/functions/array.js";
import { objectMergeRecursiveDistinct } from "../../core/functions/object.js";
import { isNullish, validateVarInterface, defaultHyperlinkBuilder } from "../../core/functions/misc.js";
import { adjacencyPositions, headingLevels, EnumerationError } from "../../core/functions/enumeration.js";
import { ElementRepresentative } from "../../core/element/element-representative.js";
import { customFormElementsRegistry } from "../form/custom-form-element.js";
import { Process } from "../../process/process.js";
import { Group } from "../group.js";
import { DescriptionListPairs } from "../description-list-pairs.js";
import { confirmModal } from "../custom-elements/dialog.js";
import { Menu } from "../menu.js";
import { Navigation } from "../navigation.js";
import { PagedListing } from "./extensions/paged-listing.js";
import { CancelablePromiseWithProcess } from "../../process/cancelable-promise-with-process.js";
import { Popup } from "../../components/popover.js";
import { SimpleNotifications } from "../../components/simple-notifications.js";
// eslint-disable-next-line no-unused-vars
import { CheckBoxElement } from "../form/checkbox-element.js";
import { userPaths } from "../../../var/paths.js";

export const defaultURLQueryParamsPublisher = {
    pushOne(name, value) {
        const params = {};
        params[name] = value;
        this.pushMany(params);
    },
    pushMany(params) {
        const url = new URL(location.href);
        for (const [name, value] of Object.entries(params)) {
            url.searchParams.set(name, value);
        }
        history.replaceState({}, "", url);
    },
    popOne(name) {
        this.popMany([name]);
    },
    popMany(params) {
        const url = new URL(location.href);
        for (const name of params) {
            url.searchParams.delete(name);
        }
        history.replaceState({}, "", url);
    }
};

export class AbstractListing extends ElementRepresentative {
    static #defaultOptions = {
        classes: [],
        id: undefined,
        startWithEmptyMessage: true,
        // When nullish, defaults to main builder in Group
        groupMemberBuilder: undefined,
        keyAsDataId: false,
        itemBindings: undefined,
        searchParams: {},
        URLQueryTranslations: undefined,
        useURLQuery: false,
        publishToURLQuery: false,
        includeMeta: true,
        includeMenu: false,
        onRemove: undefined,
        onRemoveMany: undefined,
        createMenuForEachItem: false,
        entryDeletor: undefined,
        deleteEntryOnItemRemove: false,
        deleteEntriesMessages: {
            confirm: {
                one: "Do you really want to delete entry?",
                many: stringTemplate`Do you really want to delete ${"count"} entries?`
            },
            complete: {
                done: {
                    one: "1 entry deleted",
                    many: stringTemplate`${"count"} entries deleted`
                },
                error: {
                    fail: "Deletion failed",
                    mixed: ({ errorCount, count }) => {
                        if (errorCount === count) {
                            return `Failed to delete ${count} entries`;
                        } else {
                            return `${errorCount} out of ${count} entries could not be deleted`;
                        }
                    }
                }
            }
        },
        hyperlinkBuilder: defaultHyperlinkBuilder,
        onVisit: undefined,
        urlBuilders: undefined,
        onHeadItems: undefined,
    };
    #options;
    #originalTitle;
    #header;
    #heading;
    #head;
    #menu;
    #body;
    #group;
    #footer;
    #noItemsEl;
    #emptyMessageSuspended = false;
    #meta;
    #onItemBind = new Set;
    #checkboxConstructor;
    #searchParamsRegistry = {};
    #searchParams;
    #requestSearchParams = {};
    #setSearchParamsAbortController;
    #simpleNotifications;
    #explicitTotal;
    constructor(title, options = {}) {
        // Merge recursively
        if ("deleteEntriesMessages" in options && typeof options.deleteEntriesMessages === "object") {
            options["deleteEntriesMessages"] = objectMergeRecursiveDistinct(
                AbstractListing.#defaultOptions["deleteEntriesMessages"],
                options.deleteEntriesMessages
            );
        }
        // If nullish option value, it will inherit default value anyways
        const optionsIgnoreNullish = ["deleteEntriesMessages", "hyperlinkBuilder"];
        for (const optionName of optionsIgnoreNullish) {
            if (optionName in options && isNullish(options[optionName])) {
                options[optionName] = AbstractListing.#defaultOptions[optionName];
            }
        }
        options = { ...AbstractListing.#defaultOptions, ...options };
        const attrs = {};
        if (options.id) {
            attrs.id = options.id;
        }
        const refs = {};
        const [elem] = AbstractListing.createCarcass(title, {
            classes: options.classes,
            attrs,
            refs,
            includeFooter: true,
            includeBody: true,
        });
        super(elem);
        this.#options = options;
        this.#originalTitle = title;
        this.#header = refs.header;
        this.#heading = refs.heading;
        this.#body = refs.body;
        if (Object.hasOwn(refs, "footer")) {
            this.#footer = refs.footer;
        }
        this.#group = new Group({
            memberBuilder: options.groupMemberBuilder,
            classes: ["listing-group"],
            options: {
                keyAsDataId: options.keyAsDataId,
            }
        });
        this.#group.appendTo(this.#body);
        this.#group.addCountAttrTo(elem);
        this.#group.addEventListener("countchange", e => {
            const { newCount, oldCount } = e.detail;
            if (oldCount === 0) {
                this.putDownEmptyMessage();
            } else if (newCount === 0) {
                this.putUpEmptyMessage();
            }
        });
        if (options.startWithEmptyMessage) {
            this.putUpEmptyMessage();
        }
        this.#meta = new DescriptionListPairs(["listing-meta"]);
        const [, details] = this.#meta.appendPair("Count", this.itemCount, { name: "count" });
        this.#group.updateCountText(details);
        if (options.includeMeta) {
            this.#meta.appendTo(this.#footer);
        }
        this.#searchParams = { ...this.#searchParams, ...options.searchParams };
        this.#simpleNotifications = new SimpleNotifications();
        this.#header.append(this.#simpleNotifications.toElement());
        if (options.includeMenu) {
            const listingMenu = new Menu({
                headingText: "Listing Menu",
                type: Menu.types.toggle,
                host: elem,
                classes: ["listing-menu"],
            });
            this.#menu = listingMenu;
            if (Object.hasOwn(options.includeMenu, "manage")) {
                let managerParams = {};
                if (typeof options.includeMenu.manage === "object") {
                    managerParams = options.includeMenu.manage;
                }
                listingMenu.append(this.releaseCopyManagerLaunchButton(managerParams), "manage");
            }
            listingMenu.appendTo(this.#header);
        }
    }
    static get defaultOptions() {
        return Object.assign({}, this.#defaultOptions);
    }
    get options() {
        return Object.assign({}, this.#options);
    }
    static get collectiveOptions() {
        return this.defaultOptions;
    }
    get originalTitle() {
        return this.#originalTitle;
    }
    get header() {
        return this.#header;
    }
    get heading() {
        return this.#heading;
    }
    get head() {
        return this.#head;
    }
    get group() {
        return this.#group;
    }
    get footer() {
        return this.#footer;
    }
    get meta() {
        return this.#meta;
    }
    get menu() {
        return this.#menu;
    }
    get itemCount() {
        return this.#group.count;
    }
    set explicitTotal(number) {
        this.#explicitTotal = number;
    }
    get explicitTotal() {
        return isNullish(this.#explicitTotal) ? this.itemCount : this.#explicitTotal;
    }
    get isNoItemsMessageShown() {
        return this.#noItemsEl && isElementAttached(this.#noItemsEl);
    }
    *items() {
        for (const element of this.#group.dataItems()) {
            yield element;
        }
    }
    getItemData(key) {
        return this.group.getChildData(key);
    }
    changeTitle(param) {
        this.#heading.replaceChildren(param);
    }
    empty() {
        if (this.itemCount !== 0) {
            // Clear all keys immediatelly
            this.#group.empty({ emptyKeys: true });
        }
    }
    putUpEmptyMessage() {
        if (!this.#emptyMessageSuspended && !this.isNoItemsMessageShown) {
            detachElement(this.#body);
            let node;
            if (!this.#noItemsEl) {
                node = AbstractListing.createNoItemsMessage();
            } else {
                node = this.#noItemsEl;
            }
            this.#noItemsEl = insertAfter(node, this.#header);
        }
    }
    putDownEmptyMessage() {
        if (!this.#emptyMessageSuspended && this.isNoItemsMessageShown) {
            this.#noItemsEl = detachElement(this.#noItemsEl);
        }
    }
    revisitEmptyMessage() {
        if (this.itemCount !== 0) {
            this.putDownEmptyMessage();
        } else {
            this.putUpEmptyMessage();
        }
    }
    suspendEmptyMessage() {
        if (!this.#emptyMessageSuspended) {
            this.#emptyMessageSuspended = true;
        }
    }
    unsuspendEmptyMessage() {
        if (this.#emptyMessageSuspended) {
            this.#emptyMessageSuspended = false;
        }
    }
    prepareGroup() {
        this.putDownEmptyMessage();
        if (!isElementAttached(this.#body)) {
            insertAdjacentNode(this.#header, adjacencyPositions.afterend, this.#body);
        }
    }
    get checkboxConstructor() {
        let constructor;
        if (!this.#checkboxConstructor) {
            ([, constructor] = customFormElementsRegistry.byType("checkbox"));
            this.#checkboxConstructor = constructor;
        } else {
            constructor = this.#checkboxConstructor;
        }
        return constructor;
    }
    onItemBind(callback) {
        if (typeof callback === "function") {
            this.#onItemBind.add(callback);
        }
    }
    #bindItem(item, key, element, originalElement) {
        const data = { item, key, element, originalElement };
        const controls = {};
        const toDeleteButton = (button, confirm) => {
            button.addEventListener("click", async () => {
                this.deleteEntries([key], { confirm });
            });
        }
        const deleteController = {
            button: createSimpleButton("Delete", ["delete-button"]),
            confirm: true,
            releaseButton: ({ text = "Delete", confirm = true } = {}) => {
                const button = createSimpleButton(text, ["delete-button"]);
                toDeleteButton(button, confirm);
                return button;
            }
        };
        toDeleteButton(deleteController.button, deleteController.confirm);
        controls.deleteController = deleteController;
        const isItemBindings = typeof this.#options.itemBindings === "function";
        if (this.#onItemBind.size) {
            for (const callback of this.#onItemBind) {
                callback.call(this, { item, key, element, controls, isItemBindings, originalElement });
            }
        }
        if (isItemBindings) {
            if (this.#options.createMenuForEachItem) {
                controls.releaseMenu = ({ type = "menu", exclude = [] } = {}) => {
                    let holder;
                    let visitButton;
                    let editButton;
                    const buildButton = (method, text, name) => {
                        if (this.#options?.urlBuilders?.visit) {
                            const url = this.#options.urlBuilders[method]({ key, element });
                            const builder = this.#options.hyperlinkBuilder.buildHyperlink;
                            const hyperlink = builder(url, text);
                            const [listItem] = holder.append(hyperlink, name);
                            return listItem.firstElementChild;
                        }
                    }
                    if (type === "navigation") {
                        holder = new Navigation("Actions");
                        if (!exclude.includes("visit") && this.#options.urlBuilders.visit) {
                            visitButton = buildButton("visit", "Visit", "visit");
                        }
                        if (!exclude.includes("edit") && this.#options.urlBuilders.edit) {
                            editButton = buildButton("edit", "Edit", "edit");
                        }
                    } else {
                        const options = { headingText: "Actions" };
                        if (typeof this.#options.createMenuForEachItem === "string") {
                            try {
                                options.type = Menu.types[this.#options.createMenuForEachItem];
                            } catch (error) {
                                if (!(error instanceof EnumerationError)) {
                                    throw error;
                                }
                            }
                        }
                        holder = new Menu(options);
                        if (!exclude.includes("visit")) {
                            visitButton = buildButton("visit", "Visit", "visit");
                            if (!visitButton) {
                                ([, , visitButton] = holder.appendButton("Visit", "visit", {
                                    classes: ["visit-button"]
                                }));
                            }
                        }
                        if (!exclude.includes("edit")) {
                            // eslint-disable-next-line no-unused-vars
                            ([, , editButton] = holder.appendButton("Edit", "edit", {
                                classes: ["edit-button"]
                            }));
                        }
                    }
                    if (visitButton) {
                        visitButton.addEventListener("click", e => {
                            if (typeof this.#options.onVisit === "function") {
                                this.#options.onVisit({
                                    key, element, event: e
                                });
                            }
                        });
                    }
                    holder.append(deleteController.releaseButton({ text: "Delete" }), "delete");
                    return holder;
                }
            }
            this.#options.itemBindings.call(this, {
                item, element, controls, key, listing: this, originalElement
            });
        }
        data.controls = controls;
        this.group.modifyChildData(key, data);
        this.#group.onMemberRemove(key, () => {
            if (this.#options.deleteEntryOnItemRemove) {
                this.deleteEntries([key], { confirm: false });
            }
        });
    }
    async deleteEntries(keys, { confirm = true, deleteEntriesMessages } = {}) {
        const count = keys.length;
        const itemDataIndex = Object.create(null);
        for (const key of keys) {
            const itemData = this.getItemData(key);
            itemDataIndex[key] = itemData;
        }
        const messageFormatter = (message, fnArgs) => {
            if (message instanceof StringTemplate) {
                message = message.format({ count, keys: keys.join(", ") });
            } else if (typeof message === "function") {
                message = message(fnArgs);
            }
            return message;
        }
        const messagesHandler = deleteEntriesMessages || this.#options.deleteEntriesMessages;
        if (confirm) {
            let message;
            let fnArgs;
            if (count === 1) {
                message = messagesHandler.confirm.one;
                fnArgs = { ...itemDataIndex[keys[0]] };
            } else {
                message = messagesHandler.confirm.many;
                fnArgs = { count, keys: [...keys], data: itemDataIndex };
            }
            message = messageFormatter(message, fnArgs);
            const modalOptions = {
                okText: "Delete",
                classes: ["danger"],
            };
            if (userPaths?.stylesheets?.dialog) {
                modalOptions.stylesheet = userPaths.stylesheets.dialog;
            }
            const confirmation = await confirmModal(message, modalOptions);
            if (!confirmation) {
                return;
            }
        }
        const process = new Process("deletelistingentries", "Delete Listing Entries", {
            category: "listing"
        });
        process.start();
        for (const { item } of Object.values(itemDataIndex)) {
            item.classList.add("deleting");
        }
        const gatherItemData = keys => {
            const data = Object.create(null);
            for (const key of keys) {
                data[key] = itemDataIndex[key];
            }
            return data;
        }
        const notify = (message, type) => {
            if (typeof messagesHandler.notifier === "function") {
                messagesHandler.notifier(message, type);
            } else {
                this.#simpleNotifications.send(message, type);
            }
        }
        const deleted = [];
        try {
            let result = this.#options.entryDeletor([...keys], process);
            if (result instanceof Promise) {
                result = await result;
            }
            // Single entry deleted (true) or not found (null)
            if (result === true || result === null) {
                if (result) {
                    deleted.push(...keys);
                }
                const itemData = itemDataIndex[keys[0]];
                this.dispatchEvent(new CustomEvent("entriesdeleted", {
                    detail: { keys: [...keys], data: itemData }
                }));
                const message = messagesHandler.complete.done.one;
                notify(messageFormatter(message, { key: keys[0], ...itemData }), "success");
            // Handled multiple entries
            } else if (typeof result === "object") {
                deleted.push(...result.successKeys);
                if (result.errorCount === 0) {
                    const keys = [...result.successKeys, ...result.notFoundKeys];
                    const itemData = gatherItemData(keys);
                    this.dispatchEvent(new CustomEvent("entriesdeleted", {
                        detail: { keys: [...keys], data: itemData }
                    }));
                    const message = messagesHandler.complete.done.many;
                    notify(messageFormatter(message, { keys: [...keys], data: itemData }), "success");
                } else {
                    const error = new DOMException(
                        `Could not delete ${result.errorCount} out of ${count} entries`,
                        "DeleteError"
                    );
                    const detail = {
                        error,
                        errorCount: result.errorCount,
                        errors: result.errors,
                        successCount: result.successCount,
                        count
                    };
                    this.dispatchEvent(new CustomEvent("entriesdeleteerror", { detail }));
                    const message = messagesHandler.complete.error.mixed;
                    notify(messageFormatter(message, { keys: [...keys], ...detail }), "error");
                }
            }
            process.complete();
        } catch (error) {
            this.dispatchEvent(new CustomEvent("entriesdeleteerror", {
                detail: { error }
            }));
            // Caught somewhere else, eg. inside CancelablePromise
            if (process.isRunning) {
                process.fail(error);
            }
            const message = messagesHandler.complete.error.fail;
            notify(messageFormatter(message, { keys: [...keys], data: itemDataIndex }), "error");
            console.error(error);
        } finally {
            for (const key of keys) {
                if (!deleted.includes(key)) {
                    const { item } = itemDataIndex[key];
                    item.classList.remove("deleting");
                } else {
                    this.removeItem(key);
                }
            }
        }
    }
    appendItem(item) {
        this.prepareGroup();
        this.#group.element.append(item);
    }
    appendItemFromElement(element, customKey, originalElement) {
        this.prepareGroup();
        const [attachedItem, key] = this.#group.append(element, customKey);
        this.#bindItem(attachedItem, key, element, originalElement);
        return [attachedItem, key];
    }
    insertItem(item, position, customKey, element) {
        this.prepareGroup();
        const [attachedItem, key] = this.#group.insertMember(item, position, customKey);
        this.#bindItem(attachedItem, key, element, element);
        return attachedItem;
    }
    insertItemFromElement(element, position, customKey, originalElement) {
        if (typeof position !== "number") {
            return this.appendItemFromElement(element, customKey, originalElement);
        } else {
            this.prepareGroup();
            const [attachedItem, key] = this.#group.insert(element, position, customKey);
            this.#bindItem(attachedItem, key, element, originalElement);
            return [attachedItem, key];
        }
    }
    getItem(key) {
        const data = this.group.getChildData(key);
        if (!data) {
            return null;
        }
        return data.item;
    }
    removeItem(key) {
        const item = this.getItem(key);
        if (item) {
            item.remove();
        }
    }
    addFooterIfNotExists() {
        if (!this.#footer) {
            const params = Object.values(AbstractListing.getFooterSchema());
            const elem = createElement(...params);
            if (this.#options.includeMeta) {
                elem.append(this.#meta.element);
            }
            this.element.append(elem);
        }
    }
    createHead(items) {
        const head = createElement("div", { classes: ["listing-head"] });
        if (this.#options.onHeadItems) {
            this.#options.onHeadItems(items);
        }
        let position = 1;
        const itemCount = items.length;
        for (const [name, element] of items) {
            const item = createElement("div", {
                attrs: { "data-name": name }
            });
            item.append(element);
            this.dispatchEvent(new CustomEvent("headitemcreate", {
                detail: { headItem: item, name, position, itemCount }
            }));
            head.append(item);
            position++;
        }
        if (!this.#head) {
            this.#head = head;
            this.#body.prepend(head);
        } else {
            this.#head.replaceWith(head);
        }
        return this.#head;
    }
    static getHeaderSchema(title, headingLevel) {
        return {
            tag: "header",
            options: {
                classes: ["listing-header"],
                elems: [{
                    tag: headingLevel.value,
                    options: {
                        classes: ["listing-heading"],
                        text: title,
                    },
                    ref: "heading"
                }]
            },
            ref: "header"
        };
    }
    static getFooterSchema() {
        return {
            tag: "footer",
            options: {
                classes: ["listing-footer"],
            },
            ref: "footer"
        };
    }
    static getBodySchema() {
        return {
            tag: "div",
            options: {
                classes: ["listing-body"],
            },
            ref: "body"
        };
    }
    static createCarcass(title, {
        classes = [],
        attrs,
        headingLevel = headingLevels.two,
        includeFooter = false,
        includeBody = false,
        refs = {},
    } = {}) {
        const [listing, references] = ElementRepresentative.createStandardCarcass(
            AbstractListing,
            "div",
            title,
            { classes: ["listing", ...classes], attrs, headingLevel, includeFooter, includeBody, refs }
        );
        return [listing, references];
    }
    static createNoItemsMessage({ text = "No items" } = {}) {
        return createElement("div", {
            classes: ["message"],
            elems: [{
                tag: "p",
                options: { text }
            }]
        });
    }
    get searchParamsRegistry() {
        return Object.assign({}, this.#searchParamsRegistry);
    }
    get registeredSearchParamNames() {
        return Object.keys(this.#searchParamsRegistry);
    }
    hasRegisteredSearchParam(name) {
        return Object.hasOwn(this.#searchParamsRegistry, name);
    }
    validateRegisteredSearchParam(name) {
        if (!this.hasRegisteredSearchParam(name)) {
            throw new DOMException(`Search param "${name}" is not registered`);
        }
    }
    registerSearchParam(name, data) {
        if (!this.hasRegisteredSearchParam(name)) {
            if (!data.type) {
                data.type = "checkbox";
            }
            this.#searchParamsRegistry[name] = data;
            if (!(name in this.#searchParams)) {
                this.#searchParams[name] = undefined;
            }
            this.inheritURLQueryParam(name);
        }
    }
    registerSearchParams(items) {
        for (const data of items) {
            if ("name" in data) {
                const name = data.name;
                delete data.name;
                this.registerSearchParam(name, data);
            }
        }
    }
    getSearchParamConfig(name) {
        if (this.hasRegisteredSearchParam(name)) {
            return this.#searchParamsRegistry[name];
        }
    }
    buildControlFromData(data, paramName, { title, menuOptions = {} } = {}) {
        switch (data.type) {
            case "checkbox": {
                let staticValue;
                const control = this.checkboxConstructor.createElement(paramName, {
                    label: title,
                });
                console.log(control, title);
                control.addEventListener("change", e => {
                    const { newState } = e.detail;
                    if (staticValue !== newState) {
                        staticValue = newState;
                        this.setSearchParam(paramName, newState);
                    }
                });
                this.addEventListener("searchparamsset", e => {
                    const { initiators } = e.detail;
                    if (paramName in initiators && !isNullish(initiators[paramName])) {
                        const { process } = e.detail;
                        if (process) {
                            control.process = process;
                        }
                    }
                });
                this.addEventListener("searchparamsapplied", e => {
                    const { searchParams } = e.detail;
                    if (paramName in searchParams) {
                        const value = searchParams[paramName];
                        if (control.checked !== value) {
                            staticValue = value;
                            control.checked = value;
                        }
                    }
                });
                return control;
            }
            case "menu": {
                if (isNullish(title) && "title" in data) {
                    title = data.title;
                }
                menuOptions.headingText = title;
                const menuClassName = `menu-${camelCaseToKebabCase(paramName)}`;
                if (menuOptions.classes) {
                    menuOptions.classes.push(menuClassName);
                } else {
                    menuOptions.classes = [menuClassName]
                }
                const menu = new Menu(menuOptions);
                const disableControls = () => {
                    for (const listItem of menu.list.items()) {
                        removeClasses(listItem, ["active"]);
                        listItem.firstElementChild.disabled = true;
                    }
                }
                const enableControls = () => {
                    for (const listItem of menu.list.items()) {
                        removeClasses(listItem, ["active"]);
                        listItem.firstElementChild.disabled = false;
                    }
                }
                const list = [];
                const { values, control: controlType, multiple } = data;
                menu._populator = (values, { ignoreDuplicates = true } = {}) => {
                    const itemCount = this.itemCount;
                    let index = -1;
                    for (const [name, value] of Object.entries(values)) {
                        index++;
                        if (ignoreDuplicates && menu.list.has(name)) {
                            continue;
                        }
                        let listItem;
                        let control;
                        switch (controlType) {
                            case "checkbox":
                                control = this.checkboxConstructor.createElement(`${paramName}[]`, {
                                    value: name,
                                    label: value,
                                });
                                ([listItem] = menu.insert(control, index, name));
                                control.addEventListener("change", e => {
                                    if (!multiple) {
                                        this.setSearchParam(paramName, name);
                                    } else {
                                        const { newState, value: controlValue } = e.detail;
                                        if (controlValue === null || !list.includes(controlValue)) {
                                            if (newState) {
                                                list.push(controlValue);
                                            } else {
                                                arrayElementRemove(list, name);
                                            }
                                            const params = {};
                                            params[paramName] = list.length !== 0 ? [...list] : undefined;
                                            this.setSearchParams(params);
                                        }
                                    }
                                });
                                break;
                            default:
                                ([listItem, , control] = menu.insertButton(value, index, name));
                                control.addEventListener("click", () => {
                                    if (!multiple) {
                                        this.setSearchParam(paramName, name);
                                    } else {
                                        if (!list.includes(name)) {
                                            list.push(name);
                                        } else {
                                            arrayElementRemove(list, name);
                                        }
                                        const params = {};
                                        params[paramName] = list.length !== 0 ? [...list] : undefined;
                                        this.setSearchParams(params);
                                    }
                                });
                        }
                        if (
                            (!multiple && name == this.#searchParams[paramName])
                            || (
                                multiple
                                && Array.isArray(this.#searchParams[name])
                                && this.#searchParams[paramName].includes(value)
                            )
                        ) {
                            listItem.classList.add("active");
                        }
                        if (data.requiresItems && itemCount === 0) {
                            control.disabled = true;
                        }
                    }
                    if (data.requiresItems) {
                        this.group.addEventListener("countchange", e => {
                            const { newCount, oldCount } = e.detail;
                            if (oldCount === 0) {
                                enableControls();
                            } else if (newCount === 0) {
                                disableControls();
                            }
                        });
                    }
                }
                if (values) {
                    menu._populator(values);
                }
                const removeActiveClassesFromAll = () => {
                    menu.list.element.querySelectorAll(":scope > .active").forEach(listItem => {
                        removeClasses(listItem, ["active"]);
                    });
                }
                const assignProcess = (process, value) => {
                    const listItem = menu.getListItem(String(value));
                    // Any control type
                    const control = listItem.firstElementChild;
                    if (controlType === "checkbox") {
                        control.process = process;
                    } else {
                        process.delayedInfoToggler(control, {
                            tag: "span",
                            adjacency: adjacencyPositions.afterbegin
                        });
                    }
                }
                this.addEventListener("searchparamsset", e => {
                    const { initiators } = e.detail;
                    if (paramName in initiators && !isNullish(initiators[paramName])) {
                        const { searchParams, process } = e.detail;
                        const value = searchParams[paramName];
                        if (process) {
                            if (!Array.isArray(value)) {
                                assignProcess(process, value);
                            } else {
                                for (const element of value) {
                                    assignProcess(process, element);
                                }
                            }
                        }
                    }
                });
                this.addEventListener("searchparamsapplied", e => {
                    const { searchParams } = e.detail;
                    if (paramName in searchParams) {
                        const value = searchParams[paramName];
                        if (!Array.isArray(value)) {
                            const listItem = menu.getListItem(String(searchParams[paramName]));
                            if (!listItem || !listItem.classList.contains("active")) {
                                removeActiveClassesFromAll();
                                enableControls();
                                if (listItem) {
                                    menu.select(searchParams[paramName]);
                                    listItem.classList.add("active");
                                    listItem.firstElementChild.disabled = true;
                                }
                            }
                        } else {
                            removeActiveClassesFromAll();
                            for (const element of value) {
                                const listItem = menu.getListItem(element);
                                if (listItem) {
                                    listItem.classList.add("active");
                                    if (controlType === "checkbox" && !list.includes(element)) {
                                        list.push(element);
                                        listItem.firstElementChild.checked = true;
                                    }
                                }
                            }
                        }
                    }
                });
                return menu;
            }
        }
    }
    createControlBySearchParam(paramName, { title, menuOptions } = {}) {
        if (this.hasRegisteredSearchParam(paramName)) {
            const data = this.#searchParamsRegistry[paramName];
            if ("controlBuilder" in data) {
                return data.controlBuilder({ menuOptions });
            } else {
                return this.buildControlFromData(data, paramName, { title });
            }
        }
    }
    get searchParams() {
        return this.#searchParams;
    }
    get searchParamsCopy() {
        return Object.assign({}, this.#searchParams);
    }
    filterOutUnregisteredSearchParams(params) {
        for (const key of Object.keys(params)) {
            if (!this.hasRegisteredSearchParam(key)) {
                delete params[key];
            }
        }
    }
    setSearchParams(params, { forceWhenMatching = false, updateStateParams = true, origin } = {}) {
        this.filterOutUnregisteredSearchParams(params);
        if (this.#setSearchParamsAbortController) {
            this.#setSearchParamsAbortController.abort();
        }
        const paramsComparison = AbstractListing.compareSearchParams(this.#searchParams, params);
        if (!forceWhenMatching) {
            const paramsMatching = Object.keys(paramsComparison).length === 0;
            if (paramsMatching) {
                return Promise.resolve(this.#searchParams);
            }
        }
        this.#setSearchParamsAbortController = new AbortController;
        return new CancelablePromiseWithProcess(async (resolve, reject, process) => {
            this.filterOutUnregisteredSearchParams(this.#searchParams);
            let requestParams = { ...this.#searchParams, ...this.#requestSearchParams };
            this.dispatchEvent(new CustomEvent("requestparams", {
                detail: { params, requestParams, origin }
            }));
            requestParams = { ...requestParams, ...params };
            this.#requestSearchParams = requestParams;
            this.dispatchEvent(new CustomEvent("searchparamsset", {
                detail: { searchParams: requestParams, initiators: params, process }
            }));
            const promise = this.setParamsRequest(requestParams, {
                initiators: params,
                process
            });
            Process.processToResolvers(process, promise);
            try {
                const appliedParams = await promise;
                // Can no longer abort, because, for instance, "searchparamsapplied" callbacks might initiate a new "setSearchParams"
                this.#setSearchParamsAbortController = undefined;
                this.dispatchEvent(new CustomEvent("searchparamsapplied", {
                    detail: { searchParams: appliedParams, origin }
                }));
                // Properties that are not in applied params, and whose value is "undefined", should be added to applied params as empty (eg. reset value)
                for (const [name, value] of Object.entries(requestParams)) {
                    if (!(name in appliedParams) && value === undefined) {
                        appliedParams[name] = value;
                    }
                }
                this.#searchParams = { ...this.#searchParams, ...appliedParams };
                if (updateStateParams && this.#options.publishToURLQuery) {
                    const toInclude = {};
                    const toPop = [];
                    for (const [name, value] of Object.entries(this.#searchParams)) {
                        if (!isNullish(value)) {
                            toInclude[name] = value;
                        } else {
                            toPop.push(name);
                        }
                    }
                    const publisher = this.#options.publishToURLQuery;
                    if (origin !== "init") {
                        publisher.pushMany(toInclude, { component: this });
                    } else {
                        publisher.replaceMany(toInclude, { component: this });
                    }
                    publisher.popMany(toPop, { component: this });
                    this.dispatchEvent(new CustomEvent("stateparamschange", {
                        detail: { params: this.searchParamsCopy }
                    }));
                }
                resolve(appliedParams);
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error(error);
                }
                reject(error);
            } finally {
                this.#setSearchParamsAbortController = undefined;
                this.#requestSearchParams = {};
            }
        }, this.#setSearchParamsAbortController, {
            processName: "setsearchparams",
            processTitle: "Set Listing Search Params",
            processCategory: "listing"
        });
    }
    setSearchParam(name, value, { origin } = {}) {
        const params = {};
        params[name] = value;
        return this.setSearchParams(params, { origin });
    }
    reload() {
        return this.setSearchParams(this.#searchParams, { forceWhenMatching: true });
    }
    addSearchParamsToURLComponent(URLComponent) {
        AbstractListing.addSearchParamsToURLComponent(URLComponent, this.searchParams);
    }
    get URLSearchParams() {
        const params = new URLSearchParams;
        this.addSearchParamsToURLComponent(params);
        return params;
    }
    static addSearchParamsToURLComponent(URLComponent, params) {
        validateVarInterface(URLComponent, URLSearchParams);
        for (const [name, value] of Object.entries(params)) {
            if (!isNullish(value)) {
                if (!Array.isArray(value)) {
                    URLComponent.append(name, value);
                } else {
                    value.forEach(value => {
                        URLComponent.append(`${name}[]`, value);
                    });
                }
            }
        }
    }
    static compareSearchParams(params1, params2) {
        const diff = {};
        for (const [name, value] of Object.entries(params2)) {
            const p1Value = params1[name];
            const isArray = Array.isArray(p1Value);
            if (
                !(name in params1) ||
                typeof p1Value !== typeof value ||
                (isArray ? !twoArraysEqual(p1Value, value) : p1Value !== value)
            ) {
                diff[name] = value;
            }
        }
        return diff;
    }
    get remainingSpace() {
        const listingRect = this.element.getBoundingClientRect();
        const groupRect = this.#group.element.getBoundingClientRect();
        const bottomPadding = parseInt(getComputedStyle(this.element).getPropertyValue("padding-bottom"));
        const space = Math.min(document.documentElement.clientHeight, listingRect.bottom) - bottomPadding - groupRect.bottom;
        return space;
    }
    get hasRemainingSpace() {
        return this.remainingSpace > 0;
    }
    hasRemainingSpaceOffset(offset) {
        return this.remainingSpace + offset > 0;
    }
    inheritURLQueryParam(name) {
        if (this.#options.useURLQuery) {
            let queryName = this.translateURLQueryParam(name);
            const URLParams = new URLSearchParams(location.search);
            const queryParam = URLParams.get(queryName);
            if (queryParam !== null) {
                this.#searchParams[name] = queryParam;
            }
        }
    }
    getState() {
        return this.searchParamsCopy;
    }
    setState(params, { updateStateParams = false } = {}) {
        this.setSearchParams(params, { updateStateParams });
    }
    translateURLQueryParam(name) {
        const translations = this.#options.URLQueryTranslations;
        if (typeof translations === "object" && Object.hasOwn(translations, name)) {
            return translations[name];
        }
        return name;
    }
    getManagerCopy() {
        let options = this.options;
        if (Object.hasOwn(options, "searchParams")) {
            // Start from the first page, also in case the underlying listing started empty with page 0
            options.searchParams.page = 1;
        }
        options.includeMenu = false;
        options.classes.push("manage-listing");
        options = Object.assign(options, {
            searchable: true,
            selectItems: true,
            itemBindings: ({ item, controls: { select, releaseMenu } }) => {
                const menu = releaseMenu({ exclude: ["visit", "edit"] });
                if ("shadowRoot" in item) {
                    select.setAttribute("slot", "select-checkbox");
                    menu.element.setAttribute("slot", "menu");
                }
                item.prepend(select);
                const optionsCell = item.querySelector(`:scope > [data-name="options"]`);
                if (optionsCell) {
                    menu.appendTo(optionsCell);
                } else {
                    menu.appendTo(item);
                }
            },
            onHeadItems: items => {
                items.unshift(["select", ""]);
            },
            paging: PagedListing.pagingMethods.regular,
            includePaging: false,
            createMenuForEachItem: true
        });
        const copy = this.newInstance(options);
        const extendedPagingMenu = copy.releaseExtendedPagingLandmark();
        extendedPagingMenu?.appendTo(copy.footer);
        const controlsMenu = copy.releaseControlsMenu({ includeDeleteSelected: true });
        controlsMenu?.appendTo(copy.footer);
        return copy;
    }
    createCopyPopup({ title = "Listing Management" } = {}) {
        const copy = this.getManagerCopy();
        const popup = new Popup(copy.element, {
            title,
            onClose: () => {
                popup.remove();
            }
        });
        popup.show();
        return popup;
    }
    releaseCopyManagerLaunchButton({ title = "Manage Listing", popupTitle } = {}) {
        const button = createSimpleButton(title, ["manage-listing-button"]);
        button.addEventListener("click", () => {
            this.createCopyPopup({ title: popupTitle });
        });
        return button;
    }
    registerURLBuilders(URLBuilders) {
        this.#options.urlBuilders = URLBuilders;
    }
    getURLBuilder(name) {
        if (!("urlBuilders" in this.#options) || !Object.hasOwn(this.#options.urlBuilders, name)) {
            return null;
        }
        return this.#options.urlBuilders[name];
    }
    createVisitHyperlink(key, element, { content = "Visit" } = {}) {
        const url = this.#options.urlBuilders.visit({ key, element });
        const builder = this.#options.hyperlinkBuilder.buildHyperlink;
        const hyperlink = builder(url, content);
        hyperlink.addEventListener("click", e => {
            if (typeof this.#options.onVisit === "function") {
                this.#options.onVisit({ key, element, event: e });
            }
        })
        return hyperlink;
    }
}