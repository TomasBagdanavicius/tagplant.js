"use strict";

import { createElement, createSimpleButton, removeClasses } from "../core/functions/node.js";
import { enumList } from "../core/functions/enumeration.js";
import { setPointPositionalCorner } from "../core/geometry/functions.js";
import { ElementRepresentative } from "../core/element/element-representative.js";
import { LongPressEventController } from "../core/events/types/long-press-event-controller.js";
import { EventListenersController } from "../core/events/event-listeners-controller.js";
import { eventControllersRegistry } from "../core/events/event-controllers-registry.js";
import { ScrollingObserver } from "../core/observers/scrolling-observer.js";
import { List } from "./list.js";
import { ManualPopover } from "../components/popover.js";

export class Menu extends ElementRepresentative {
    static #types = enumList({
        regular: "regular",
        toggle: "toggle",
        longpress: "longpress"
    }, "menuTypes");
    #list;
    #groupHolder;
    #type;
    #headingEl;
    #originalHeadingText;
    #typeSwitchData = { toggle: {}, longpress: {} };
    #selectedData = { key: undefined, value: undefined };
    constructor({
        headingText = "Menu",
        type = Menu.types.regular,
        classes = [],
        host = document.documentElement,
        includeCloseButton = true,
        useTypeClasses = true,
        closeOnButtonClick = true,
        selectValue = false,
    } = {}) {
        if (!classes.includes("menu")) {
            classes.push("menu");
        }
        if (useTypeClasses) {
            classes.push(`menu-${type.name}`);
        }
        if (selectValue) {
            classes.push("selectable");
        }
        const el = createElement("div", { classes });
        super(el);
        this.#list = new List;
        this.host = host;
        this.includeCloseButton = includeCloseButton;
        this.closeOnButtonClick = closeOnButtonClick;
        this.selectValue = selectValue;
        this.#headingEl = Menu.createHeadingElement({ type: type.name, text: headingText });
        this.#originalHeadingText = headingText;
        this.#groupHolder = createElement("div", {
            classes: ["group-holder"],
            elems: [this.#list.element],
        });
        el.append(this.#headingEl, this.#groupHolder);
        this.setType(type);
        this.constrainAttributeToList("data-type", Menu.#types, () => this.#type, element => {
            this.setType(element);
        });
        this.#list.addCountAttrTo(el);
        const scrollingObserver = new ScrollingObserver;
        scrollingObserver.observe(this.#list.element, [el]);
        this.addEventListener("typechange", e => {
            const { oldType, newType } = e.detail;
            removeClasses(el, `menu-${oldType.name}`);
            el.classList.add(`menu-${newType.name}`);
        });
    }
    get list() {
        return this.#list;
    }
    get type() {
        return this.#type;
    }
    static get types() {
        return Menu.#types;
    }
    get headingElement() {
        return this.#headingEl;
    }
    set headingText(value) {
        this.#headingEl.innerText = value;
    }
    get headingText() {
        return this.#headingEl.innerText;
    }
    prepend(el, key, { keyToDataset, keyToClasses, listItemClasses } = {}) {
        if (el.localName === "button") {
            this.#bindButton(el, key);
        }
        return this.#list.prepend(el, key, { keyToDataset, keyToClasses, classes: listItemClasses });
    }
    prependButton(text, key, { classes = [] } = {}) {
        const button = createSimpleButton(text, classes);
        return [...this.prepend(button, key), button];
    }
    append(el, key, { keyToDataset, keyToClasses, listItemClasses } = {}) {
        if (el instanceof Element && el.localName === "button") {
            this.#bindButton(el, key);
        }
        return this.#list.append(el, key, { keyToDataset, keyToClasses, classes: listItemClasses });
    }
    appendButton(text, key, { classes = [] } = {}) {
        const button = createSimpleButton(text, classes);
        return [...this.append(button, key), button];
    }
    insert(el, position, key, { keyToDataset, keyToClasses, listItemClasses } = {}) {
        if (el.localName === "button") {
            this.#bindButton(el, key);
        }
        return this.#list.insert(el, position, key, { keyToDataset, keyToClasses, classes: listItemClasses });
    }
    insertButton(text, position, key) {
        const button = createSimpleButton(text);
        this.#bindButton(button, key);
        return [...this.insert(button, position, key), button];
    }
    remove(key) {
        return this.#list.remove(key);
    }
    getListItem(key) {
        return this.#list.getItem(key);
    }
    getButton(key) {
        return this.getListItem(key)?.querySelector("button");
    }
    *buttons() {
        for (const child of this.#list.items()) {
            yield child?.querySelector("button");
        }
    }
    #bindButton(button, key) {
        button.addEventListener("click", () => {
            if (this.closeOnButtonClick) {
                this.closePopover();
            }
            if (this.selectValue) {
                const { value: oldValue, key: oldKey } = this.#selectedData;
                this.headingText = button.innerText;
                this.dispatchEvent(new CustomEvent("changeselectvalue", {
                    detail: { oldValue, newValue: this.headingText, oldKey, newKey: key }
                }));
                this.#selectedData = { value: this.headingText, key };
            }
        });
    }
    closePopover() {
        if (this.#type
            && Object.hasOwn(this.#typeSwitchData, this.#type.name)
            && Object.hasOwn(this.#typeSwitchData[this.#type.name], "popover")
        ) {
            this.#typeSwitchData[this.#type.name].popover.hide();
        }
    }
    setType(type) {
        if (type === this.#type) {
            return;
        }
        if (this.#type) {
            switch (this.#type) {
                case Menu.types.toggle: {
                    this.#typeSwitchData.toggle.popover.toggleFundamentals();
                    const newHeadingEl = Menu.createHeadingElement({
                        type: "regular", text: this.headingText
                    });
                    this.#headingEl.replaceWith(newHeadingEl);
                    this.#headingEl = newHeadingEl;
                    if (this.#typeSwitchData.toggle.closeButton) {
                        this.#typeSwitchData.toggle.closeButton.remove();
                    }
                    break;
                }
                case Menu.types.longpress: {
                    eventControllersRegistry.disable("longpress", this.host);
                    this.#typeSwitchData.longpress.popover.toggleFundamentals();
                    this.#typeSwitchData.longpress.listener.remove();
                    if (this.#typeSwitchData.longpress.closeButton) {
                        this.#typeSwitchData.longpress.closeButton.remove();
                    }
                    break;
                }
            }
        }
        const createCloseButton = () => {
            return createSimpleButton("Close", ["close-button"]);
        }
        switch (type) {
            case Menu.types.toggle: {
                const newHeadingEl = Menu.createHeadingElement({
                    type: "toggle", text: this.headingText
                });
                this.#headingEl.replaceWith(newHeadingEl);
                this.#headingEl = newHeadingEl;
                this.#typeSwitchData.toggle.popover = new ManualPopover(this.#groupHolder, {
                    toggler: this.#headingEl,
                    position: "BL",
                    showImmediately: false
                });
                if (this.includeCloseButton) {
                    const closeButton = createCloseButton();
                    this.#groupHolder.prepend(closeButton);
                    closeButton.addEventListener("click", () => {
                        this.#typeSwitchData.toggle.popover.hide();
                    });
                    this.#typeSwitchData.toggle.closeButton = closeButton;
                }
                break;
            }
            case Menu.types.longpress: {
                eventControllersRegistry.register(LongPressEventController);
                eventControllersRegistry.enable("longpress", this.host);
                this.#typeSwitchData.longpress.popover = new ManualPopover(this.element, {
                    showImmediately: false
                });
                if (!this.#typeSwitchData.longpress.listener) {
                    const listenerParams = {
                        type: "longpress",
                        args: [
                            e => {
                                const { baseEvent } = e.detail;
                                this.#typeSwitchData.longpress.popover.suspendNextLightDismiss();
                                this.#typeSwitchData.longpress.popover.show();
                                setPointPositionalCorner(this.element, baseEvent.x, baseEvent.y);
                            }
                        ]
                    };
                    this.#typeSwitchData.longpress.listener = new EventListenersController({
                        longpress: listenerParams
                    }, this.host);
                }
                this.#typeSwitchData.longpress.listener.add();
                if (this.includeCloseButton) {
                    const closeButton = createCloseButton();
                    this.#headingEl.after(closeButton);
                    closeButton.addEventListener("click", () => {
                        this.#typeSwitchData.longpress.popover.hide();
                    });
                    this.#typeSwitchData.longpress.closeButton = closeButton;
                }
                break;
            }
        }
        const oldType = this.#type;
        this.#type = type;
        this.dispatchEvent(new CustomEvent("typechange", {
            detail: { oldType, newType: type }
        }));
        this.element.setAttribute("data-type", type.value);
    }
    select(key) {
        if (this.selectValue) {
            const button = this.getButton(key);
            if (button) {
                const { value: oldValue, key: oldKey } = this.#selectedData;
                this.headingText = button.innerText;
                this.dispatchEvent(new CustomEvent("changeselectvalue", {
                    detail: { oldValue, newValue: this.headingText, oldKey, newKey: key }
                }));
                this.#selectedData = { value: this.headingText, key };
            }
        }
    }
    resetSelect() {
        if (this.selectValue) {
            const { value: oldValue, key: oldKey } = this.#selectedData;
            this.headingText = this.#originalHeadingText;
            this.dispatchEvent(new CustomEvent("changeselectvalue", {
                detail: { oldValue, newValue: undefined, oldKey, newKey: undefined }
            }));
            this.#selectedData = { value: undefined, key: undefined };
        }
    }
    static createHeadingElement({ type = "regular", text = "Menu", classes = [] } = {}) {
        if (type === "toggle") {
            return createSimpleButton(text, ["heading", ...classes]);
        } else {
            return createElement("span", { text, classes: ["heading", ...classes] });
        }
    }
}