"use strict";

import { createElement, prependChild, createLabel, onAttributeChange, createDetailsElement, removeClasses } from "../../core/functions/node.js";
import { writeTextToClipboard, validateVarInterface, isNullish } from "../../core/functions/misc.js";
import { generateRandomString, formatCountedString } from "../../core/functions/string.js";
import { findNearestLargerStepValue, findNearestSmallerStepValue } from "../../core/functions/number.js";
import { adjacencyPositions } from "../../core/functions/enumeration.js";
import { WebComponentMixin } from "../../core/web-component/web-component-mixin.js";
import { FormWebComponentMixin } from "../../core/web-component/form-web-component-mixin.js";
import { Constraint, massValidate } from "../../core/constraints/constraint.js";
import { MatchValueConstraint } from "../../core/constraints/match-value-constraint.js";
import { EventListenersController } from "../../core/events/event-listeners-controller.js";
import { List } from "../list.js";
import { ControlsManager } from "../controls-manager.js";
import { Menu } from "../menu.js";

export class CustomFormElement extends FormWebComponentMixin({
    ElInterface: WebComponentMixin({ options: { observeStylesheet: true } })
}) {
    static observedAttributes = [...super.observedAttributes, "name", "id", "label", "description", "required", "disabled", "controlsmenu", "controlslist", "controlsfilter", "matchvalue"];
    container;
    constraints;
    oneTimeValidityState;
    errorList;
    static controlsModes = ["off", "always", "toggle", "toggle-if", "longpress"];
    static controlsFilterModes = ["none", "active"];
    #controlsMode;
    #settingControlsMode;
    #controlsConfig;
    #controlsList = [];
    #controlsOptionRemove = true;
    #controlsAbortController;
    #labelEl;
    #descriptionEl;
    constructor() {
        super();
        this.addEventListener("valuechange", e => {
            const { newValue } = e.detail;
            if (newValue !== "") {
                this.classList.add("has-value");
            } else {
                removeClasses(this, ["has-value"]);
            }
            this.setValidity();
            if (this.wasConnected) {
                this.reportValidity();
            }
        });
        this.constraints = this.getInternalConstraintsConfig();
        this.container = this.shadowRoot;
        this.addAfterConnectedAttrCallback("controlsmenu", mode => {
            if (!this.constructor.controlsModes.includes(mode)) {
                mode = "off";
            }
            this.setupControls({ mode });
        });
        this.addAfterConnectedAttrCallback("controlslist", () => {
            this.updateControlsList();
            if (this.controlsManager) {
                this.controlsManager.updateExcludeList(this.#controlsList);
            }
        });
        this.addAfterConnectedAttrCallback("controlsfilter", value => {
            this.#modifyControlsFilter(value);
            if (this.controlsManager) {
                this.controlsManager.updateOption("remove", this.#controlsOptionRemove);
            }
        });
        // Allows to append description to the bottom of children list.
        this.addAfterConnectedAttrCallback("description", value => {
            this.#modifyDescription(value);
        });
    }
    get id() {
        if (this.hasAttribute("id")) {
            return this.getAttribute("id");
        } else {
            return this.elementId;
        }
    }
    get elementId() {
        return "form-element";
    }
    get disabled() {
        return !!this.getAttribute("disabled");
    }
    // This is called before `connectedCallback`
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        switch (name) {
            case "id": {
                let newId;
                if (newValue !== null) {
                    newId = newValue;
                } else {
                    newId = this.elementId;
                }
                if (this.#labelEl) {
                    this.#labelEl.setAttribute("for", newId);
                }
                this.dispatchEvent(new CustomEvent("idchange", {
                    detail: { id: newId }
                }));
                break;
            }
            case "label":
                this.#modifyLabel(newValue);
                break;
            case "disabled": {
                const controlsManager = this.getControlsManager();
                if (controlsManager.hasMenu()) {
                    const menu = controlsManager.getMenu();
                    const heading = menu.headingElement;
                    if (heading.localName === "button") {
                        if (oldValue === null) {
                            heading.disabled = true;
                        } else if (newValue === null) {
                            heading.disabled = false;
                        }
                    }
                }
                break;
            }
            /* A special case where custom constraint is implemented internally. */
            case "matchvalue": {
                const constraintName = MatchValueConstraint.name;
                if (oldValue === null && newValue !== null) {
                    if (!this.hasCustomConstraint(MatchValueConstraint.name)) {
                        const constraint = new MatchValueConstraint(newValue);
                        this.setCustomConstraint(constraint, { attrName: "matchvalue" });
                    } else {
                        this.enableConstraint(constraintName, newValue);
                    }
                } else if (newValue === null && oldValue !== null) {
                    this.disableConstraint(constraintName);
                } else {
                    const constraint = this.constraints[constraintName].instance;
                    constraint.value = newValue;
                    this.setValidity();
                    this.reportValidity();
                }
                break;
            }
            default: {
                const constraintData = this.getConstraintByAttrName(name);
                if (constraintData) {
                    const [constraintName] = constraintData;
                    if (oldValue === null && newValue !== null) {
                        this.enableConstraint(constraintName, newValue);
                    } else if (newValue === null && oldValue !== null) {
                        this.disableConstraint(constraintName);
                    }
                }
                break;
            }
        }
    }
    // This is called after `attributeChangedCallback`
    connectedCallback() {
        super.connectedCallback();
    }
    getInternalConstraintsConfig() {
        return {
            required: {
                type: "internal",
                attrName: "required",
                message: "Please fill out this field.",
                description: "This field is required.",
                flag: "valueMissing"
            },
        };
    }
    get controlsConfig() {
        this.#controlsConfig ??= this.getControlsConfig();
        return this.#controlsConfig;
    }
    hasControl(name) {
        const config = this.controlsConfig;
        return Object.hasOwn(config, name);
    }
    updateControlsList() {
        const listString = this.getAttribute("controlslist");
        this.#controlsList = this.makeControlsList(listString, true);
    }
    getControlsManager() {
        if (!this.controlsManager) {
            this.updateControlsList();
            this.controlsManager = new ControlsManager(
                this.controlsConfig,
                this.#controlsList,
                { remove: this.#controlsOptionRemove }
            );
        }
        return this.controlsManager;
    }
    setControlsList(list) {
        const string = list.join(",");
        this.setAttribute("controlslist", string);
    }
    makeControlsList(string, validate = false) {
        if (!string) {
            return [];
        }
        const parts = string.split(",");
        const list = [];
        for (const value of parts) {
            if (value.startsWith("no")) {
                const name = value.substring(2);
                if (!validate || this.hasControl(name)) {
                    list.push(name);
                }
            }
        }
        return list;
    }
    setControlsFilter(value) {
        if (value !== "none" && value !== "active") {
            return null;
        }
        this.setAttribute("controlsfilter", value);
        return true;
    }
    #modifyControlsFilter(value) {
        if (value === "none" || value !== "active") {
            this.#controlsOptionRemove = false;
        } else {
            this.#controlsOptionRemove = true;
        }
    }
    setupControls({ mode = "toggle" } = {}) {
        if (!this.constructor.controlsModes.includes(mode)) {
            throw new DOMException(`Mode ${mode} is invalid`);
        }
        if (mode === this.#controlsMode || this.#settingControlsMode === mode) {
            return null;
        }
        this.#settingControlsMode = mode;
        const manager = this.getControlsManager();
        const attachMenu = () => {
            const hadMenu = manager.hasMenu();
            const menu = manager.getMenu({ host: this });
            if (menu.isDetached) {
                this.container.appendChild(menu.element);
            }
            if (!hadMenu) {
                menu.addEventListener("typechange", e => {
                    const { newType } = e.detail;
                    switch (newType) {
                        case Menu.types.toggle:
                            if (
                                this.#controlsMode !== "toggle"
                                && this.#controlsMode !== "toggle-if"
                            ) {
                                this.setupControls({ mode: "toggle" });
                            }
                            break;
                        case Menu.types.longpress:
                            if (this.#controlsMode !== "longpress") {
                                this.setupControls({ mode: "longpress" });
                            }
                            break;
                    }
                });
            }
            return menu;
        }
        const detachMenu = () => {
            if (this.controlsManager && this.controlsManager.hasMenu()) {
                const menu = this.controlsManager.getMenu({ host: this });
                menu.detach();
                menu.setType(Menu.types.regular);
            }
        }
        const abortEvents = () => {
            if (this.#controlsAbortController) {
                this.#controlsAbortController.abort();
            }
        }
        let menu;
        switch (mode) {
            case "off":
                abortEvents();
                detachMenu();
                break;
            case "always":
                abortEvents();
                menu = attachMenu();
                break;
            case "toggle":
                abortEvents();
                menu = attachMenu();
                menu.setType(Menu.types.toggle);
                break;
            case "toggle-if": {
                abortEvents();
                detachMenu();
                const update = () => {
                    if (manager.length) {
                        menu = attachMenu();
                        menu.setType(Menu.types.toggle);
                    } else {
                        detachMenu();
                    }
                }
                update();
                const abortController = new AbortController;
                this.#controlsAbortController = abortController;
                manager.addEventListener("lengthchange", () => {
                    update();
                }, { signal: abortController.signal });
                break;
            }
            case "longpress":
                abortEvents();
                menu = attachMenu();
                menu.setType(Menu.types.longpress);
                break;
        }
        this.#controlsMode = mode;
        this.setAttribute("controlsmenu", mode);
        this.#settingControlsMode = undefined;
        return true;
    }
    changeName(name) {
        this.setAttribute("name", name);
    }
    changeId(id) {
        this.setAttribute("id", id);
    }
    changeLabel(text) {
        this.setAttribute("label", text);
    }
    changeDescription(text) {
        this.setAttribute("description", text);
    }
    get labelElement() {
        return this.#labelEl;
    }
    #modifyLabel(text) {
        if (text) {
            if (!this.#labelEl) {
                const labelEl = createLabel(text, this.id, this.shadowRoot, {
                    classes: ["title"]
                });
                if (this.container === this.shadowRoot) {
                    this.#labelEl = this.insertElementAfterStylesheets(labelEl);
                } else {
                    this.#labelEl = prependChild(this.container, labelEl);
                }
            } else {
                this.#labelEl.innerText = text;
            }
        } else if (this.#labelEl) {
            this.#labelEl.remove();
            this.#labelEl = undefined;
        }
    }
    #modifyDescription(text) {
        if (text) {
            if (!this.#descriptionEl) {
                const content = createElement("p", { text });
                const [descriptionEl] = createDetailsElement("Description", content, {
                    classes: ["description"],
                    open: true,
                });
                this.#descriptionEl = this.shadowRoot.appendChild(descriptionEl);
            } else {
                this.#descriptionEl.innerText = text;
            }
        } else if (this.#descriptionEl) {
            this.#descriptionEl.remove();
            this.#descriptionEl = undefined;
        }
    }
    get descriptionElement() {
        return this.#descriptionEl;
    }
    enableConstraint(name, value) {
        if (isNullish(value)) {
            value = "";
        }
        if (this.hasConstraint(name)) {
            const config = this.constraints[name];
            if (
                Object.hasOwn(config, "attrName")
                // Check if exact attribute value hasn't been added yet. If this is called in `attributeChangedCallback`, will prevent repeated call.
                && this.getAttribute(config.attrName) !== value
            ) {
                this.setAttribute(config.attrName, String(value));
            }
            if (config.type === "custom") {
                config.status = true;
            }
            this.setValidity();
        }
    }
    disableConstraint(name) {
        if (this.hasConstraint(name)) {
            const config = this.constraints[name];
            if (Object.hasOwn(config, "attrName") && this.hasAttribute(config.attrName)) {
                this.removeAttribute(config.attrName);
            }
            if (config.type === "custom") {
                config.status = false;
            }
            this.setValidity();
            this.reportValidity();
        }
    }
    hasInternalConstraintEnabled(name) {
        if (!this.hasInternalConstraint(name)) {
            return null;
        }
        const config = this.constraints[name];
        if (!Object.hasOwn(config, "attrName")) {
            return null;
        }
        return this.attributes.getNamedItem(config.attrName) !== null;
    }
    writeValueToClipboard() {
        writeTextToClipboard(this.value);
    }
    getControlsConfig() {
        return { copy: {
            text: "Copy",
            active: this.value !== "",
            position: 0,
            obtainButton: button => {
                button.addEventListener("click", () => {
                    this.writeValueToClipboard();
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", e => {
                    CustomFormElement.hasValueStatusChange(e.target, config, onStatusChange);
                });
            }
        }, reportvalidity: {
            text: "Report Validity",
            active: !this.valid && !this.isReportingValidity(),
            position: 0,
            obtainButton: button => {
                button.addEventListener("click", () => {
                    this.reportValidity();
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", () => {
                    if (config.connected && this.valid) {
                        onStatusChange(false);
                    } else if (!config.connected && !this.valid && !this.isReportingValidity()) {
                        onStatusChange(true);
                    }
                });
                this.addEventListener("validityshown", () => {
                    if (config.connected) {
                        onStatusChange(false);
                    }
                });
                this.addEventListener("validationstatechange", e => {
                    if (e.detail.newState === false) {
                        if (!config.connected) {
                            onStatusChange(true);
                        }
                    } else if (config.connected) {
                        onStatusChange(false);
                    }
                });
            }
        }};
    }
    setCustomConstraint(constraint, { attrName, priority = 1 } = {}) {
        validateVarInterface(constraint, Constraint);
        const constraintName = constraint.constructor.name;
        if (this.hasCustomConstraint(constraintName)) {
            throw new DOMException(`Constraint ${constraintName} has already been set`, "DuplicateError");
        }
        this.constraints[constraintName] = {
            type: "custom",
            attrName,
            instance: constraint,
            priority,
        };
        if (attrName && !CustomFormElement.observedAttributes.includes(attrName)) {
            /* Custom attribute observer is used, because it's not possible to add new attributes into the `observedAttributes` collection. */
            const attrObserver = onAttributeChange(this, attrName, ({ newValue, oldValue }) => {
                if (oldValue === null && newValue !== null) {
                    this.enableConstraint(constraintName, newValue);
                } else if (newValue === null && oldValue !== null) {
                    this.disableConstraint(constraintName);
                } else {
                    constraint.value = newValue;
                    this.setValidity();
                    this.reportValidity();
                }
            });
            this.constraints[constraintName].attrObserver = attrObserver;
        }
        if ("associatedFormElements" in constraint) {
            const asscElements = constraint.associatedFormElements;
            if (asscElements) {
                const listenerArgs = [() => {
                    this.setValidity();
                    this.reportValidity();
                }];
                for (const asscElement of asscElements) {
                    asscElement.addEventListener("input", ...listenerArgs);
                }
                constraint.addEventListener("associatedformelementschange", e => {
                    const { removedElements, addedElements } = e.detail;
                    for (const removedElement of removedElements) {
                        removedElement.removeEventListener("input", ...listenerArgs);
                    }
                    for (const addedElement of addedElements) {
                        addedElement.addEventListener("input", ...listenerArgs);
                    }
                });
            }
        }
        this.enableConstraint(constraintName, constraint.value);
    }
    removeCustomConstraint(name) {
        if (!Object.hasOwn(this.constraints, name) || this.constraints[name] !== "custom") {
            return null;
        }
        const config = this.constraints[name];
        if ("attrObserver" in config) {
            config.attrObserver.disconnect();
        }
        delete this.constraints[name];
        this.setValidity();
    }
    *filterConstraintsConfig(key, value) {
        for (const [constraintName, config] of Object.entries(this.constraints)) {
            if (config[key] === value) {
                yield [constraintName, config];
            }
        }
    }
    hasConstraint(name, type) {
        let result = Object.hasOwn(this.constraints, name);
        if (!result) {
            return false;
        }
        if (type) {
            result = this.constraints[name].type === type;
        }
        return result;
    }
    getConstraintByAttrName(name) {
        const results = Array.from(this.filterConstraintsConfig("attrName", name));
        if (results.length !== 0) {
            return results[0];
        } else {
            return null;
        }
    }
    hasInternalConstraint(name) {
        return this.hasConstraint(name, "internal");
    }
    hasCustomConstraint(name) {
        return this.hasConstraint(name, "custom");
    }
    getCustomConstraintsSet() {
        const set = new Set;
        for (const [, config] of this.filterConstraintsConfig("type", "custom")) {
            if (config.status === true) {
                set.add(config.instance);
            }
        }
        return set;
    }
    validateValueAgainstCustomConstraints(value) {
        const set = this.getCustomConstraintsSet();
        if (set.size === 0) {
            return null;
        }
        return massValidate(set, value);
    }
    setValidity() {
        let highestFlag = null;
        let validationMessage;
        const truthyFlags = [];
        const validityState = {};
        let flags = this.getBaseValidityFlags();
        const update = data => {
            truthyFlags.push(...Object.keys(data));
            for (const [flag, message] of Object.entries(data)) {
                if (Object.hasOwn(validityState, flag)) {
                    validityState[flag].push(message);
                } else {
                    validityState[flag] = [message];
                }
                const flagIndex = this.getValidityFlagIndex(flag);
                if (highestFlag === null || highestFlag > flagIndex) {
                    highestFlag = flagIndex;
                    validationMessage = message;
                }
            }
        }
        const baseData = {};
        for (const [flag, value] of Object.entries(flags)) {
            if (value === true) {
                let message;
                for (const [, config] of this.filterConstraintsConfig("flag", flag)) {
                    message = typeof config.message === "function"
                        ? config.message({
                            value: this.value,
                            constraintValue: this.getAttribute(config.attrName)
                        })
                        : config.message;
                    baseData[flag] = message;
                }
                // Custom message was not found. Try using inner element's message.
                if (!message && "getInternalValidationMessage" in this) {
                    baseData[flag] = this.getInternalValidationMessage();
                }
            }
        }
        update(baseData);
        const customResult = this.validateValueAgainstCustomConstraints(this.value);
        if (customResult) {
            for (const [, data] of Object.entries(customResult)) {
                update(data);
            }
        }
        if (this.oneTimeValidityState) {
            update(this.oneTimeValidityState);
            this.oneTimeValidityState = undefined;
        }
        if (!flags) {
            flags = super.constructor.buildValidityFlagsTemplate();
        }
        for (const flag of truthyFlags) {
            flags[flag] = true;
        }
        this.validityState = validityState;
        const wasValid = this.valid;
        // console.log("Validity state:", flags, validationMessage);
        this.internals.setValidity(flags, validationMessage);
        const isValid = this.valid;
        if (wasValid !== isValid) {
            this.dispatchEvent(new CustomEvent("validationstatechange", {
                detail: { newState: isValid }
            }));
        }
    }
    reportValidity() {
        this.removeValidityMessages();
        if (!this.valid) {
            if (!this.errorList) {
                const list = new List({ type: List.types.unordered, classes: ["error-list"] });
                this.attachErrorList(list);
                this.errorList = list;
            } else if (this.errorList.isDetached) {
                this.attachErrorList(this.errorList);
            }
            for (const validityFlag of super.constructor.validityFlags) {
                if (Object.hasOwn(this.validityState, validityFlag)) {
                    const messages = this.validityState[validityFlag];
                    for (const message of messages) {
                        this.errorList.append(document.createTextNode(message));
                    }
                }
            }
            this.dispatchEvent(new CustomEvent("validityshown"));
        } else {
            this.dispatchEvent(new CustomEvent("validityremoved"));
        }
    }
    attachErrorList(list) {
        list.attach(this.shadowRoot, { adjacency: adjacencyPositions.beforeend });
    }
    isReportingValidity() {
        return this.errorList && this.errorList.isAttached;
    }
    removeValidityMessages() {
        if (this.errorList && this.errorList.isAttached) {
            this.errorList.detach();
            this.errorList.empty();
        }
    }
    setOneTimeValidityState(validityState) {
        const result = {};
        for (const [flag, message] of Object.entries(validityState)) {
            if (super.constructor.validityFlags.includes(flag)) {
                result[flag] = message;
            }
        }
        this.oneTimeValidityState = result;
        this.setValidity();
    }
    static createCustomElement(name, attrs) {
        const [customElementName] = customFormElementsRegistry.byType(this.type);
        return createElement(customElementName, {
            attrs: { ...attrs, name }
        });
    }
    static hasValueStatusChange(target, config, onStatusChange) {
        if (target.value !== "") {
            if (!config.active) {
                onStatusChange(true);
            }
        } else {
            onStatusChange(false);
        }
    }
}

export class FormElementWithInternalFE extends CustomFormElement {
    #internalFormElement;
    constructor() {
        super();
        if (!("createInternalFormElement" in this)) {
            throw new TypeError(`Child class must define "createInternalFormElement" method`);
        }
        this.#internalFormElement = this.createInternalFormElement();
        this.#internalFormElement.classList.add("form-element", "internal-form-element");
        this.#internalFormElement.id = this.id;
        this.addEventListener("idchange", e => {
            this.#internalFormElement.id = e.detail.id;
        });
        FormElementWithInternalFE.trackInnerElemFocus(this.#internalFormElement, this);
    }
    get internalFormElement() {
        return this.#internalFormElement;
    }
    getInternalValidationMessage() {
        return this.internalFormElement.validationMessage;
    }
    static trackInnerElemFocus(elem, target) {
        const listeners = {
            focus: {
                type: "focus",
                args: [
                    () => {
                        target.classList.add("has-focus");
                    }
                ]
            },
            blur: {
                type: "blur",
                args: [
                    () => {
                        removeClasses(target, ["has-focus"]);
                    }
                ]
            }
        }
        return new EventListenersController(listeners, elem, { autoadd: true });
    }
}

export class FieldedFormElement extends FormElementWithInternalFE {
    #fieldEl;
    constructor() {
        super();
        this.#fieldEl = createElement("div", { classes: ["field"] });
        this.#fieldEl.appendChild(this.internalFormElement);
        this.container = this.#fieldEl;
        // This allows to precede "valuechange" event listener in the super class.
        this.addValueChangeCallback(({ newValue }) => {
            /* Important: if it's a match, then it means that value was changed after "input" event into the internal form element. The problem is that we don't want to set the value through the "value" parameter, because this will reset validity. See: "snippets/js/validity/on-input.html" */
            if (newValue !== this.internalFormElement.value) {
                this.internalFormElement.value = newValue;
            }
        });
    }
    createInternalFormElement() {
        return this.createElement();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        super.attributeChangedCallback(name, oldValue, newValue);
        switch (name) {
            case "name":
                this.internalFormElement.setAttribute("name", newValue);
                break;
            case "disabled":
                if (oldValue === null) {
                    this.internalFormElement.setAttribute("disabled", newValue);
                } else if (newValue === null) {
                    this.internalFormElement.removeAttribute("disabled");
                }
        }
    }
    connectedCallback() {
        super.connectedCallback();
        this.insertElementAfterStylesheets(this.#fieldEl);
        this.setAttribute("tabindex", "0");
        this.dispatchEvent(new CustomEvent("fieldpopulated", { detail: { field: this.#fieldEl } }));
        this.internalFormElement.addEventListener("input", e => {
            this.setValue(e.target.value, { type: e.inputType, inputData: e.data });
        });
    }
    enableConstraint(name, value) {
        if (this.hasInternalConstraint(name)) {
            const config = this.constraints[name];
            if (Object.hasOwn(config, "attrName")) {
                this.internalFormElement.setAttribute(config.attrName, value);
            }
        }
        super.enableConstraint(name, value);
    }
    disableConstraint(name) {
        if (this.hasInternalConstraint(name)) {
            const config = this.constraints[name];
            if (Object.hasOwn(config, "attrName")) {
                this.internalFormElement.removeAttribute(name);
            }
        }
        super.disableConstraint(name);
    }
    getBaseValidityFlags() {
        return this.copyInnerValidityFlags();
    }
    copyInnerValidityFlags() {
        const flags = {};
        super.constructor.validityFlags.forEach(flag => {
            flags[flag] = this.internalFormElement.validity[flag];
        });
        return flags;
    }
}

export class TextFormElement extends FieldedFormElement {
    static observedAttributes = [...super.observedAttributes, "minlength", "maxlength"];
    constructor() {
        super();
    }
    static get type() {
        return "text";
    }
    get elementId() {
        return "input";
    }
    empty() {
        this.setValue("", { inputType: "empty" });
    }
    clear() {
        this.empty();
    }
    createElement() {
        return createElement("input", {
            attrs: {
                type: this.constructor.type,
            }
        });
    }
    getInternalConstraintsConfig() {
        return { ...super.getInternalConstraintsConfig(), ...{
            minlength: {
                type: "internal",
                attrName: "minlength",
                message: ({ constraintValue, value }) => {
                    const words = ["character", "characters"];
                    const requiredCharsText = formatCountedString(constraintValue, ...words);
                    const usingCharsText = formatCountedString(value.length, ...words);
                    return `Please use at least ${requiredCharsText} (you are currently using ${usingCharsText}).`
                },
                description: "",
                flag: "tooShort"
            },
            maxlength: {
                type: "internal",
                attrName: "maxlength",
                message: ({ constraintValue, value }) => {
                    const words = ["character", "characters"];
                    const requiredCharsText = formatCountedString(constraintValue, ...words);
                    const usingCharsText = formatCountedString(value.length, ...words);
                    return `Please shorten this text to ${requiredCharsText} or less (you are currently using ${usingCharsText}).`;
                },
                description: "",
                flag: "tooLong"
            }
        }};
    }
    static hasSelectAllValueChange(target, config, onStatusChange, value) {
        if (target.selectionStart === 0 && target.selectionEnd === value.length) {
            if (config.connected) {
                onStatusChange(false);
            }
        } else if (!config.connected && value) {
            onStatusChange(true);
        }
    }
    getControlsConfig() {
        return { ...super.getControlsConfig(), ...{ cut: {
            text: "Cut",
            active: this.value !== "",
            obtainButton: button => {
                button.addEventListener("click", () => {
                    this.writeValueToClipboard();
                    this.empty();
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", e => {
                    CustomFormElement.hasValueStatusChange(e.target, config, onStatusChange);
                });
            }
        }, empty: {
            text: "Empty",
            active: this.value !== "",
            obtainButton: button => {
                button.addEventListener("click", () => {
                    this.empty();
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", e => {
                    CustomFormElement.hasValueStatusChange(e.target, config, onStatusChange);
                });
            }
        }, selectall: {
            text: "Select All",
            active: !isNullish(this.value) && this.value !== "" && (this.internalFormElement.selectionStart !== 0 || this.internalFormElement.selectionEnd !== this.value.length),
            obtainButton: button => {
                button.addEventListener("click", () => {
                    this.internalFormElement.focus();
                    this.internalFormElement.select();
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", e => {
                    CustomFormElement.hasValueStatusChange(e.target, config, onStatusChange);
                });
                /* Apparently, when input is focused out, it still retains selection, which can be restored by focusing over again. */
                this.internalFormElement.addEventListener("select", e => {
                    TextFormElement.hasSelectAllValueChange(e.target, config, onStatusChange, this.value);
                });
                this.internalFormElement.addEventListener("click", e => {
                    TextFormElement.hasSelectAllValueChange(e.target, config, onStatusChange, this.value);
                });
            }
        } } };
    }
}

export class SearchFormElement extends TextFormElement {
    constructor() {
        super();
    }
    static get type() {
        return "search";
    }
}

export class PasswordFormElement extends TextFormElement {
    constructor() {
        super();
    }
    static get type() {
        return "password";
    }
    get hasTextSecurity() {
        return this.internalFormElement.type === "password";
    }
    #dispatchTextSecurityChangeEvent(status) {
        const event = new CustomEvent("textsecuritychange", {
            detail: { status }
        });
        this.dispatchEvent(event);
    }
    showWithoutTextSecurity() {
        if (this.hasTextSecurity) {
            this.internalFormElement.type = "text";
            this.#dispatchTextSecurityChangeEvent(false);
        }
    }
    showWithTextSecurity() {
        if (!this.hasTextSecurity) {
            this.internalFormElement.type = "password";
            this.#dispatchTextSecurityChangeEvent(true);
        }
    }
    toggleTextSecurity() {
        if (this.hasTextSecurity) {
            this.showWithoutTextSecurity();
        } else {
            this.showWithTextSecurity();
        }
    }
    getControlsConfig() {
        return { ...super.getControlsConfig(), ...{ showpassword: {
            text: "Show Password",
            active: this.value !== "" && this.hasTextSecurity,
            obtainButton: button => {
                button.addEventListener("click", () => {
                    this.showWithoutTextSecurity();
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", e => {
                    if (e.target.value !== "" && this.hasTextSecurity && !config.active) {
                        onStatusChange(true);
                    } else if (e.target.value === "" && config.active) {
                        onStatusChange(false);
                    }
                });
                this.addEventListener("textsecuritychange", e => {
                    // Does not have text security
                    if (!e.detail.status && config.active) {
                        onStatusChange(false);
                    } else if (e.detail.status && !config.active) {
                        onStatusChange(true);
                    }
                });
            }
        }, hidepassword: {
            text: "Hide Password",
            name: "hidePassword",
            active: this.value !== "" && !this.hasTextSecurity,
            obtainButton: button => {
                button.addEventListener("click", () => {
                    this.showWithTextSecurity();
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", e => {
                    if (e.target.value !== "" && !this.hasTextSecurity && !config.active) {
                        onStatusChange(true);
                    } else if (e.target.value === "" && config.active) {
                        onStatusChange(false);
                    }
                });
                this.addEventListener("textsecuritychange", e => {
                    // Does not have text security
                    if (!e.detail.status && !config.active) {
                        onStatusChange(true);
                    } else if (e.detail.status && config.active) {
                        onStatusChange(false);
                    }
                });
            }
        }, generaterandonandcopy: {
            text: "Generate Random and Copy",
            active: this.value === "",
            obtainButton: button => {
                button.addEventListener("click", () => {
                    this.value = generateRandomString(24);
                    this.writeValueToClipboard();
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", e => {
                    if (e.target.value === "" && !config.connected) {
                        onStatusChange(true);
                    } else if (e.target.value !== "" && config.connected) {
                        onStatusChange(false);
                    }
                });
            }
        } } };
    }
}

export class EmailFormElement extends TextFormElement {
    constructor() {
        super();
    }
    static get type() {
        return "email";
    }
    getControlsConfig() {
        const config = super.getControlsConfig();
        // Email does not support "select" event, which is limited to text, search, url, tel, and password.
        delete config.selectall;
        return config;
    }
    getInternalConstraintsConfig() {
        return { ...super.getInternalConstraintsConfig(), ...{
            minlength: {
                type: "internal",
                attrName: "minlength",
                message: ({ constraintValue, value }) => {
                    const words = ["character", "characters"];
                    const requiredCharsText = formatCountedString(constraintValue, ...words);
                    const usingCharsText = formatCountedString(value.length, ...words);
                    return `Please use at least ${requiredCharsText} (you are currently using ${usingCharsText}).`
                },
                description: "",
                flag: "tooShort"
            }
        }};
    }
}

export class NumberFormElement extends TextFormElement {
    static observedAttributes = [...super.observedAttributes, "min", "max"];
    constructor() {
        super();
    }
    static get type() {
        return "number";
    }
    getControlsConfig() {
        const config = super.getControlsConfig();
        // Number does not support "select" event, which is limited to text, search, url, tel, and password.
        delete config.selectall;
        return { ...config, ...{ stepup: {
            text: "Step Up",
            active: this.value === "" || this.internalFormElement.max === "" || (this.internalFormElement.max && this.value < this.internalFormElement.max),
            obtainButton: button => {
                button.addEventListener("click", () => {
                    /* Note: not using `stepUp()`, because it does not support numbers with remainder */
                    const stepAsNumber = Number(this.internalFormElement.step);
                    const step = this.internalFormElement.step === "" || isNaN(stepAsNumber) ? 1 : stepAsNumber;
                    const valueAsNumber = Number(this.value);
                    let value = this.value === "" || isNaN(valueAsNumber)
                        ? this.internalFormElement.min ?? step
                        : findNearestLargerStepValue(valueAsNumber, step);
                    if (this.internalFormElement.min) {
                        value = Math.max(value, this.internalFormElement.min);
                    }
                    this.value = String(value);
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", () => {
                    if (this.internalFormElement.max) {
                        const valueAsNumber = Number(this.value);
                        if (
                            this.value !== ""
                            && !isNaN(valueAsNumber)
                            && this.internalFormElement.max <= valueAsNumber
                        ) {
                            onStatusChange(false);
                        } else if (!config.active) {
                            onStatusChange(true);
                        }
                    }
                });
            }
        }, stepdown: {
            text: "Step Down",
            active: this.value === "" || this.internalFormElement.max === "" || (this.internalFormElement.max && this.value < this.internalFormElement.max),
            obtainButton: button => {
                button.addEventListener("click", () => {
                    /* Note: not using `stepDown()`, because it does not support numbers with remainder */
                    const stepAsNumber = Number(this.internalFormElement.step);
                    const step = this.internalFormElement.step === "" || isNaN(stepAsNumber) ? 1 : stepAsNumber;
                    const valueAsNumber = Number(this.value);
                    let value = this.value === "" || isNaN(valueAsNumber)
                        ? this.internalFormElement.min ? this.internalFormElement.min : 0 - step
                        : findNearestSmallerStepValue(valueAsNumber, step);
                    if (this.internalFormElement.max) {
                        value = Math.min(value, this.internalFormElement.max);
                    }
                    this.value = String(value);
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", () => {
                    if (this.internalFormElement.min) {
                        const valueAsNumber = Number(this.value);
                        if (
                            this.value !== ""
                            && !isNaN(valueAsNumber)
                            && this.internalFormElement.min >= valueAsNumber
                        ) {
                            onStatusChange(false);
                        } else if (!config.active) {
                            onStatusChange(true);
                        }
                    }
                });
            }
        }, usemin: {
            text: "Use Min",
            active: this.internalFormElement.min && this.internalFormElement.value !== this.internalFormElement.min,
            obtainButton: button => {
                button.addEventListener("click", () => {
                    this.value = String(this.internalFormElement.min);
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", () => {
                    if (this.internalFormElement.min) {
                        onStatusChange(this.value !== this.internalFormElement.min);
                    } else if (config.active) {
                        onStatusChange(false);
                    }
                });
            }
        }, usemax: {
            text: "Use Max",
            active: this.internalFormElement.max && this.internalFormElement.value !== this.internalFormElement.max,
            obtainButton: button => {
                button.addEventListener("click", () => {
                    this.value = String(this.internalFormElement.max);
                });
                return button;
            },
            init: (onStatusChange, config) => {
                this.addEventListener("input", () => {
                    if (this.internalFormElement.max) {
                        onStatusChange(this.value !== this.internalFormElement.max);
                    } else if (config.active) {
                        onStatusChange(false);
                    }
                });
            }
        } } };
    }
    getInternalConstraintsConfig() {
        return { ...super.getInternalConstraintsConfig(), ...{
            min: {
                type: "internal",
                attrName: "min",
                message: ({ constraintValue, value }) => {
                    return `Value must be greater than or equal to ${constraintValue} (you are using ${value}).`;
                },
                description: "",
                flag: "rangeUnderflow"
            },
            max: {
                type: "internal",
                attrName: "max",
                message: ({ constraintValue, value }) => {
                    return `Value must be less than or equal to ${constraintValue} (you are using ${value}).`;
                },
                description: "",
                flag: "rangeOverflow"
            }
        }};
    }
}

export class TextareaFormElement extends TextFormElement {
    static observedAttributes = [...super.observedAttributes];
    constructor() {
        super();
    }
    static get type() {
        return "textarea";
    }
    createElement() {
        return createElement("textarea", {
            attrs: {
                type: this.constructor.type,
            }
        });
    }
}

export const customFormElementsRegistry = {
    map: new Map,
    add(name, constructor, { define = true, ignoreIfDefined = true } = {}) {
        this.map.set(name, constructor);
        if (define) {
            if ((ignoreIfDefined && !customElements.get(name)) || !ignoreIfDefined) {
                customElements.define(name, constructor);
            }
        }
    },
    addMany(items, { define = true } = {}) {
        for (const [name, constructor] of Object.entries(items)) {
            this.add(name, constructor, { define });
        }
    },
    byType(type) {
        for (const [name, constructor] of this.map.entries()) {
            if (constructor.type === type) {
                return [name, constructor];
            }
        }
        return null;
    },
    byCustomElementName(searchName) {
        for (const [name, constructor] of this.map.entries()) {
            if (name === searchName) {
                return constructor;
            }
        }
        return null;
    },
    defineAll() {
        for (const [name, constructor] of this.map.entries()) {
            if (!customElements.get(name)) {
                customElements.define(name, constructor);
            }
        }
    }
};

customFormElementsRegistry.addMany({
    "text-form-element": TextFormElement,
    "search-form-element": SearchFormElement,
    "password-form-element": PasswordFormElement,
    "email-form-element": EmailFormElement,
    "number-form-element": NumberFormElement,
    "textarea-form-element": TextareaFormElement,
});