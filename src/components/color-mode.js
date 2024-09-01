"use strict";

import { createElement, createSimpleButton, onAttributeChange, removeClasses } from "../core/functions/node.js";
import { objectValidateStructure } from "../core/functions/object.js";
import { isNullish, validateVarInterface } from "../core/functions/misc.js";
import { EnumerationError, EnumerationMember, adjacencyPositions, enumList, enumMemberBelongsTo, validateEnumMember } from "../core/functions/enumeration.js";
import { WebComponentMixin } from "../core/web-component/web-component-mixin.js";
import { Menu } from "../element/menu.js";
import { Process } from "../process/process.js";
import { onConcurrentAction } from "../process/jobs.js";

export const colorMode = (() => {
    const themes = enumList({
        light: "Light",
        dark: "Dark"
    }, "colorModeThemes");
    const colorModes = enumList({
        light: "Light",
        dark: "Dark",
        os: "OS"
    }, "colorModes");
    const defaultStoreController = {
        name: "DefaultStoreController",
        value: colorModes.os,
        async fetch() {
            return this.value;
        },
        async save(value) {
            validateEnumMember(value, "colorModes");
            this.value = value;
            return value;
        }
    }
    Object.seal(defaultStoreController);
    const defaultLocalStorageStoreController = {
        name: "DefaultLocalStorageStoreController",
        key: "colorMode",
        async fetch() {
            const value = localStorage.getItem(this.key);
            if (value !== null) {
                return colorModes[value];
            } else {
                return null;
            }
        },
        async save(value) {
            validateEnumMember(value, "colorModes");
            localStorage.setItem(this.key, value.name);
            return value;
        }
    }
    Object.seal(defaultLocalStorageStoreController);
    const lightColorSchemeMediaQuery = matchMedia(`(prefers-color-scheme:${themes.light.name})`);
    const docElem = document.documentElement;
    let OSTheme = lightColorSchemeMediaQuery.matches ? themes.light : themes.dark;
    lightColorSchemeMediaQuery.addEventListener("change", e => {
        // Matches "light" mode media query
        if (e.matches) {
            OSTheme = themes.light;
        } else {
            OSTheme = themes.dark;
        }
        window.dispatchEvent(new CustomEvent("osthemechange", {
            detail: { theme: OSTheme }
        }));
    });
    let colorMode;
    let theme;
    let storeController = defaultStoreController;
    let hasCustomStoreController = false;
    const broadcasting = new BroadcastChannel("colorMode");
    onAttributeChange(docElem, "data-theme", ({ newValue }) => {
        if (!theme && newValue !== null) {
            docElem.removeAttribute("data-theme");
        } else if (theme && newValue !== theme.name) {
            docElem.setAttribute("data-theme", theme.name);
        }
    });
    let colorModeSet = false;
    if (docElem.hasAttribute("data-color-mode")) {
        const attrColorMode = docElem.getAttribute("data-color-mode");
        try {
            colorMode = colorModes[attrColorMode];
        } catch (error) {
            if (!(error instanceof EnumerationError)) {
                throw error;
            }
        }
    } else {
        setColorMode(defaultStoreController.value);
        colorModeSet = true;
    }
    if (docElem.hasAttribute("data-theme")) {
        const attrTheme = docElem.getAttribute("data-theme");
        try {
            themes[attrTheme];
        } catch (error) {
            if (error instanceof EnumerationError) {
                docElem.removeAttribute("data-theme");
            }
        }
    }
    if (!colorModeSet && colorMode) {
        setThemeFromColorMode(colorMode)
    }
    function setTheme(value) {
        if (value !== theme) {
            const oldTheme = theme;
            theme = value;
            docElem.setAttribute("data-theme", theme.name);
            document.dispatchEvent(new CustomEvent("themechange", {
                detail: { newTheme: theme, oldTheme }
            }));
        }
    }
    function setThemeFromColorMode(colorMode) {
        setTheme(getThemeFromColorMode(colorMode));
    }
    function getThemeFromColorMode(value) {
        switch (value) {
            case colorModes.os:
                return OSTheme;
            default:
                if (value === colorModes.light) {
                    return themes.light;
                } else {
                    return themes.dark;
                }
        }
    }
    function setColorMode(value, { broadcast = true } = {}) {
        if (value !== colorMode) {
            const oldColorMode = colorMode;
            colorMode = value;
            docElem.setAttribute("data-color-mode", colorMode.name);
            document.dispatchEvent(new CustomEvent("colormodechange", {
                detail: { newColorMode: colorMode, oldColorMode }
            }));
            setThemeFromColorMode(colorMode);
            if (broadcast) {
                broadcasting.postMessage({
                    colorMode: colorMode.name,
                    controllerName: storeController.name
                });
            }
        }
    }
    const exposure = new class extends EventTarget {
        get colorMode() {
            return colorMode;
        }
        get colorModes() {
            return colorModes;
        }
        get theme() {
            return theme;
        }
        get themes() {
            return themes;
        }
        get OSTheme() {
            return OSTheme;
        }
        get hasCustomStoreController() {
            return hasCustomStoreController;
        }
        get defaultStoreController() {
            return defaultStoreController;
        }
        get defaultLocalStorageStoreController() {
            return defaultLocalStorageStoreController;
        }
        get nextColorMode() {
            switch (colorMode) {
                case colorModes.light:
                    return colorModes.dark;
                case colorModes.dark:
                    return colorModes.os;
                case colorModes.os:
                    return colorModes.light;
                default:
                    return undefined;
            }
        }
        async getColorMode() {
            let value = await storeController.fetch();
            if (value === null) {
                value = await storeController.save(defaultStoreController.value);
            }
            return value;
        }
        async setCustomStoreController(controller, { apply = false } = {}) {
            this.validateStoreController(defaultStoreController);
            storeController = controller;
            hasCustomStoreController = true;
            if (apply) {
                let value;
                if (apply instanceof EnumerationMember && enumMemberBelongsTo(apply, "colorModes")) {
                    value = apply;
                } else {
                    value = await this.getColorMode();
                }
                setColorMode(value);
            }
        }
        unsetCustomStoreController() {
            if (hasCustomStoreController) {
                storeController = defaultStoreController;
                hasCustomStoreController = false;
            }
        }
        async saveColorMode(value, { force = false, signal } = {}) {
            const currentGoals = { colorMode };
            const newGoals = { colorMode: value };
            const callback = async signal => {
                await storeController.save(value, { signal });
            }
            const payload = {};
            const promise = onConcurrentAction("savecolormode", newGoals, currentGoals, callback, {
                payload,
                force,
                signal
            });
            if (!payload.process) {
                const abortController = new AbortController;
                const process = Process.wrapAroundPromise(promise, [
                    "savecolormode",
                    "Save Color Mode",
                    { handle: abortController }
                ]);
                payload.process = process;
                this.dispatchEvent(new CustomEvent("savestart", {
                    detail: { colorMode: value, process }
                }));
            }
            await promise;
            setColorMode(value);
            return value;
        }
        async saveNextColorMode() {
            return this.saveColorMode(this.nextColorMode);
        }
        releaseMenu({ headingText = "Theme", classes = [], type, selectValue } = {}) {
            const menu = new Menu({ headingText, type, classes, selectValue });
            for (const member of Object.values(colorModes)) {
                const [listItem, , button] = menu.appendButton(member.value, member.name);
                if (member === colorMode) {
                    listItem.classList.add("active");
                    button.disabled = true;
                }
                button.addEventListener("click", () => {
                    this.saveColorMode(member);
                });
            }
            this.addEventListener("savestart", e => {
                const { colorMode, process } = e.detail;
                const button = menu.getButton(colorMode.name);
                if (button) {
                    process.delayedInfoToggler(button, {
                        adjacency: adjacencyPositions.afterbegin,
                        tag: "span"
                    });
                }
            });
            document.addEventListener("colormodechange", e => {
                const { newColorMode, oldColorMode } = e.detail;
                const oldColorModeListItem = menu.list.getItem(oldColorMode.name);
                if (oldColorModeListItem) {
                    removeClasses(oldColorModeListItem, ["active"]);
                    const oldColorModeButton = menu.getButton(oldColorMode.name);
                    oldColorModeButton.disabled = false;
                }
                const listItem = menu.list.getItem(newColorMode.name);
                listItem.classList.add("active");
                const newColorModeButton = menu.getButton(newColorMode.name);
                newColorModeButton.disabled = true;
            });
            this.addColorModeAttrTo(menu.element);
            return menu;
        }
        releaseTogglerButton() {
            const button = createSimpleButton(colorMode.value);
            button.title = "Toggle Color Mode";
            button.addEventListener("click", () => {
                this.saveNextColorMode();
            });
            this.updateColorModeText(button);
            this.addColorModeAttrTo(button);
            this.addEventListener("savestart", e => {
                const { process } = e.detail;
                process.delayedInfoToggler(button, {
                    adjacency: adjacencyPositions.afterbegin,
                    tag: "span"
                });
            });
            return button;
        }
        releaseTogglerCustomElement() {
            return createElement("color-mode-toggler");
        }
        addColorModeAttrTo(elem) {
            validateVarInterface(elem, Element);
            elem.setAttribute("data-color-mode", "");
            this.updateColorModeOnAttr(elem.getAttributeNode("data-color-mode"));
        }
        updateColorModeOnAttr(attr) {
            validateVarInterface(attr, Attr);
            attr.value = colorMode.name;
            document.addEventListener("colormodechange", e => {
                attr.value = e.detail.newColorMode.name;
            });
        }
        updateColorModeText(elem) {
            elem.textContent = colorMode.value;
            document.addEventListener("colormodechange", e => {
                elem.textContent = e.detail.newColorMode.value;
            });
        }
        validateStoreController(controller) {
            objectValidateStructure(controller, [
                { name: "name", type: "string", required: true },
                { name: "fetch", type: "function", required: true },
                { name: "save", type: "function", required: true },
            ]);
        }
    }
    Object.freeze(exposure);
    addEventListener("osthemechange", () => {
        if (colorMode === colorModes.os) {
            setThemeFromColorMode(colorMode);
        }
    });
    broadcasting.addEventListener("message", e => {
        const { colorMode, controllerName } = e.data;
        if (!controllerName || controllerName === storeController.name) {
            setColorMode(colorModes[colorMode], { broadcast: false });
        }
    });
    onAttributeChange(docElem, "data-color-mode", ({ oldValue, newValue, attrName }) => {
        if (Object.hasOwn(colorModes, newValue)) {
            if (colorMode.name !== newValue) {
                exposure.saveColorMode(colorModes[newValue]);
            }
        } else if (!isNullish(oldValue)) {
            docElem.setAttribute(attrName, oldValue);
        } else {
            docElem.removeAttribute(attrName);
        }
    });
    class ColorModeTogglerCustomElement extends WebComponentMixin() {
        constructor() {
            super();
            this.replaceChildren();
        }
        connectedCallback() {
            super.connectedCallback();
            exposure.addColorModeAttrTo(this);
            const button = exposure.releaseTogglerButton();
            this.shadowRoot.append(button);
        }
    }
    customElements.define("color-mode-toggler", ColorModeTogglerCustomElement);
    return exposure;
})();