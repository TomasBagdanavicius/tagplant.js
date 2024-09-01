"use strict";

import { createElement, disableFormSubmitButtons, enableFormSubmitButtons, findFormSubmitButtons, findUniqueId, prependChild } from "../../core/functions/node.js";
import { determineConfigByMap } from "../../core/functions/object.js";
import { validateVarInterface } from "../../core/functions/misc.js";
import { adjacencyPositions, enumList, findEnumMemberByValue, httpMethods, validateEnumMember, headingLevels } from "../../core/functions/enumeration.js";
import { ElementRepresentative } from "../../core/element/element-representative.js";
import { MatchValueConstraint } from "../../core/constraints/match-value-constraint.js";
import { Menu } from "../menu.js";
import { Navigation } from "../navigation.js";
import { Process } from "../../process/process.js";
import { networkRequest } from "../../process/network-request.js";
import { CustomFormElement } from "./custom-form-element.js";

export function createNonSelfClosingFormInputButton(text, form) {
    const options = { text };
    if (form) {
        options.attrs = { form };
    }
    return createElement("button", options);
}

export const formEncodingTypes = enumList({
    wwwform: "application/x-www-form-urlencoded",
    multipart: "multipart/form-data",
    plaintext: "text/plain"
}, "formEncodingTypes");

export class Form extends ElementRepresentative {
    #header;
    #mainFieldset;
    #footer;
    #menu;
    static #formConfigProps = [
        "title",
        "submitText",
        "method",
        "pageName",
        "requestURL",
        "bracketPrefix",
        "data",
        "navigation",
    ];
    static #formElementConfigProps = [
        "type",
        "subtype",
        "genericType",
        "set",
        "required",
        "relationship",
        "relationshipOtherModule",
        "relationshipOtherModuleTitle",
        "title",
        "min",
        "max",
        "description",
        "match",
        "allowEmpty",
        "value",
    ];
    constructor(url, {
        classes = [],
        id = findUniqueId("form"),
        title,
        submitText = "Submit",
        method = httpMethods.post,
        enctype = formEncodingTypes.wwwform,
        sendOnSubmit = true,
        agentValidationReporting = false,
        includeResetButton = false,
    } = {}) {
        validateVarInterface(url, URL);
        validateEnumMember(method, "httpMethods");
        validateEnumMember(enctype, "formEncodingTypes");
        const attrs = { method: method.name, action: url.toString() };
        if (enctype !== formEncodingTypes.wwwform) {
            attrs.enctype = enctype.value;
        }
        if (!agentValidationReporting) {
            attrs.novalidate = "novalidate";
        }
        const refs = {};
        const elem = Form.createCarcass({ classes, id, attrs, refs });
        super(elem);
        this.id = id;
        this.submitText = submitText;
        this.title = title;
        this.#mainFieldset = refs.mainFieldset;
        this.sendOnSubmit = sendOnSubmit;
        this.addFooterIfNotExists({ includeResetButton });
        if (title) {
            this.addHeaderIfNotExists();
        }
        elem.addEventListener("submit", event => {
            this.submit({ event });
        });
        const handleStateOfSubmitButtons = () => {
            const isFormValid = Form.isElementInvalid(elem);
            if (isFormValid) {
                enableFormSubmitButtons(elem);
            } else {
                disableFormSubmitButtons(elem);
            }
        }
        elem.addEventListener("input", () => {
            handleStateOfSubmitButtons();
        });
        Form.onFormElementAddAndRemove(
            elem,
            handleStateOfSubmitButtons,
            handleStateOfSubmitButtons
        );
    }
    get url() {
        const value = this.element.getAttribute("action");
        if (!value) {
            return null;
        }
        return value;
    }
    get header() {
        return this.#header;
    }
    get footer() {
        return this.#footer;
    }
    get menu() {
        return this.#menu;
    }
    get mainFieldset() {
        return this.#mainFieldset;
    }
    get httpMethod() {
        return httpMethods[this.element.method];
    }
    get enctype() {
        return findEnumMemberByValue(formEncodingTypes, this.element.enctype);
    }
    get formData() {
        return new FormData(this.element);
    }
    get asURLSearchParams() {
        return new URLSearchParams(this.formData);
    }
    get valid() {
        // Note: not documented on MDN, but working
        return this.element.checkValidity();
    }
    reportValidity() {
        if (!this.valid) {
            for (const element of this.element.elements) {
                if ("reportValidity" in element) {
                    element.reportValidity();
                }
            }
        }
    }
    async submit({ event, timeout, processCategory } = {}) {
        if (!this.valid) {
            if (event) {
                event.preventDefault();
            }
            this.reportValidity();
        } else if (this.sendOnSubmit) {
            if (event) {
                event.preventDefault();
            }
            const cancelablePromise = this.sendAsNetworkRequest({ timeout, processCategory });
            try {
                const payload = await cancelablePromise;
                const iterator = this.nestedErrorsIterator(payload.data);
                this.publishCustomErrors(iterator);
                this.dispatchEvent(new CustomEvent("output", { detail: { payload } }));
                return payload;
            } catch (error) {
                this.dispatchEvent(new CustomEvent("outputerror", { detail: { error } }));
                console.error(error);
            }
        }
    }
    createMenu({ includeResetButton = false } = {}) {
        const menu = new Menu({ headingText: "Main Actions", classes: ["form-menu"] });
        const submitButton = createNonSelfClosingFormInputButton(this.submitText, this.id);
        menu.append(submitButton);
        if (includeResetButton) {
            const resetButton = createElement("input", {
                attrs: { type: "reset", value: "Reset", form: this.id }
            });
            menu.append(resetButton);
        }
        return menu;
    }
    createHeader({ headingLevel = headingLevels.two } = {}) {
        const headerEl = createElement("header", { classes: ["form-header"] });
        if (this.title) {
            const headingEl = createElement(headingLevel.value, { classes: ["form-heading"], text: this.title });
            headerEl.prepend(headingEl);
        }
        return headerEl;
    }
    addHeaderIfNotExists() {
        if (!this.#header) {
            this.#header = prependChild(this.element, this.createHeader());
        }
    }
    createFooter({ includeResetButton = false } = {}) {
        const menu = this.createMenu({ includeResetButton });
        const footerEl = createElement("footer", {
            classes: ["form-footer"],
            elems: [
                menu.element,
            ]
        });
        return { footerEl, menu };
    }
    addFooterIfNotExists({ includeResetButton = false } = {}) {
        if (!this.#footer) {
            const { footerEl, menu } = this.createFooter({ includeResetButton });
            this.#footer = this.element.appendChild(footerEl);
            this.#menu = menu;
        }
    }
    appendToMainFieldset(formElement) {
        return this.#mainFieldset.insertBefore(formElement, null);
    }
    serialize() {
        return this.asURLSearchParams.toString();
    }
    findElementByName(name) {
        return this.element.querySelector(`[name="${name}"]`);
    }
    getNetworkRequestParams() {
        const headers = {
            "Content-Type": this.enctype.value,
        };
        let body;
        switch (this.enctype) {
            case formEncodingTypes.wwwform:
                body = this.serialize();
                break;
            case formEncodingTypes.multipart:
                body = this.formData;
                break;
            case formEncodingTypes.plaintext:
                body = this.serialize();
                break;
        }
        const abortController = new AbortController;
        return {
            url: this.url,
            handle: abortController,
            options: {
                method: this.httpMethod,
                headers,
                body
            }
        };
    }
    sendAsNetworkRequest({ timeout = 10_000, processCategory = "main" } = {}) {
        const params = this.getNetworkRequestParams();
        const { options } = params;
        options.timeout = timeout;
        options.processCategory = processCategory;
        // options.trackDownloadProgress = false;
        const cancelablePromise = networkRequest(...Object.values(params));
        this.attachProcessToSubmitButtons(cancelablePromise.process);
        return cancelablePromise;
    }
    attachProcessToSubmitButtons(process) {
        validateVarInterface(process, Process);
        if (process.isRunning) {
            const buttons = findFormSubmitButtons(this.element);
            buttons.forEach(button => {
                button.disabled = true;
                let adjacency;
                if (button instanceof HTMLButtonElement) {
                    adjacency = adjacencyPositions.afterbegin;
                } else {
                    adjacency = adjacencyPositions.beforebegin;
                }
                process.delayedInfoToggler(button, {
                    adjacency,
                    tag: "span"
                });
            });
            process.addEventListener("ended", () => {
                buttons.forEach(button => {
                    button.disabled = false;
                });
            });
        }
    }
    *nestedErrorsIterator(data) {
        if (data) {
            for (const [name, details] of Object.entries(data)) {
                if (Object.hasOwn(details, "errors")) {
                    yield [name, details.errors];
                }
            }
        }
    }
    publishCustomErrors(iterable) {
        for (const [name, errors] of iterable) {
            const element = this.findElementByName(name);
            if (element) {
                element.setOneTimeValidityState(errors);
                element.reportValidity();
            }
        }
    }
    clear() {
        const toIgnore = ["fieldset", "button", "object"];
        for (const element of this.element.elements) {
            if (!toIgnore.includes(element.localName)) {
                if (element instanceof CustomFormElement && "clear" in element && typeof element.clear === "function") {
                    element.clear();
                } else if (element.localName === "select") {
                    if (element.selectedIndex !== 0) {
                        element.selectedIndex = 0;
                    }
                } else if (element.type === "checkbox" || element.type === "radio") {
                    if (element.checked) {
                        element.checked = false;
                    }
                } else {
                    element.value = "";
                }
            }
        }
    }
    static buildIdFromName(name, formId) {
        if (typeof name !== "string" || !name || typeof formId !== "string" || !formId) {
            return undefined;
        }
        return formId.concat("_", name);
    }
    static createCarcass({ classes, id, attrs, refs = {} } = {}) {
        return createElement("form", {
            classes,
            id,
            attrs,
            elems: [{
                tag: "fieldset",
                options: {
                    classes: ["main"],
                    elems: [createElement("legend", { text: "Main Fields" })],
                },
                ref: "mainFieldset",
            }]
        }, refs);
    }
    static from(data, formMap, formElementMap, { formElementBuilder, hyperlinkBuilder } = {}) {
        const config = determineConfigByMap(formMap, data, {
            validProps: Form.#formConfigProps,
            considerArrayAsMultiPath: true,
        });
        const options = {
            title: config.title,
            classes: [],
        };
        if (config.submitText) {
            options.submitText = config.submitText;
        }
        if (config.method) {
            options.method = httpMethods[config.method];
        }
        if (config.pageName) {
            options.classes.push(config.pageName);
        }
        const url = new URL(config.requestURL, location.href);
        const form = new Form(url, options);
        if (config.subtitle) {
            form.changeSubheading(config.subtitle);
        }
        let bracketPrefix;
        if (config.bracketPrefix) {
            bracketPrefix = config.bracketPrefix;
        }
        const collection = new Map;
        const formId = form.element.id;
        const elementsWithMatch = new Map;
        for (let [name, formElementData] of Object.entries(config.data)) {
            formElementData = determineConfigByMap(formElementMap, formElementData, {
                validProps: Form.#formElementConfigProps,
                considerArrayAsMultiPath: true,
            });
            if (bracketPrefix) {
                name = `${bracketPrefix}[${name}]`;
            }
            const wrapperElems = formElementBuilder.getWrapperElements(name, formElementData, formId);
            if (wrapperElems) {
                const { wrapper, element: formEl } = wrapperElems;
                collection.set(name, formEl);
                if (wrapper) {
                    form.appendToMainFieldset(wrapper);
                }
                if (formElementData.match) {
                    elementsWithMatch.set(name, formEl);
                }
            }
        }
        elementsWithMatch.forEach((element, name) => {
            const formElementData = determineConfigByMap(formElementMap, config.data[name], {
                validProps: Form.#formElementConfigProps,
                considerArrayAsMultiPath: true,
            });
            if (collection.has(formElementData.match)) {
                const associatedElement = collection.get(formElementData.match);
                const constraint = new MatchValueConstraint(associatedElement);
                element.setCustomConstraint(constraint, { attrName: "matchvalue" });
            }
        });
        if (config.navigation) {
            const navigation = Navigation.fromSchema(config.navigation, {
                hyperlinkBuilder,
                heading: "Form Navigation",
            });
            form.footer.appendChild(navigation.element);
        }
        return form;
    }
    static isElementInvalid(formElement) {
        return !formElement.matches(":invalid");
    }
    static onFormElementAddAndRemove(form, onAdd, onRemove) {
        const handleNewElements = mutationsList => {
            for (let mutation of mutationsList) {
                if (mutation.type === "childList") {
                    mutation.addedNodes.forEach(node => {
                        if (node instanceof HTMLFormElement || node instanceof CustomFormElement) {
                            onAdd();
                        }
                    });
                    mutation.removedNodes.forEach(node => {
                        if (node instanceof HTMLFormElement || node instanceof CustomFormElement) {
                            onRemove();
                        }
                    });
                }
            }
        }
        const observer = new MutationObserver(handleNewElements);
        observer.observe(form, { childList: true, subtree: true });
    }
}