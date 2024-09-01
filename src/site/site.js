"use strict";

import { createElement, onChildListChange, createDetailsElement, createHyperlink, removeClasses } from "../core/functions/node.js";
import { validateVarInterface, compareTwoUrls, issueHookEvent } from "../core/functions/misc.js";
import { compareTwoObjects, objectUnassign } from "../core/functions/object.js";
import { arrayContainsElement } from "../core/functions/array.js";
import { blobFromBase64 } from "../core/functions/misc.js";
import { adjacencyPositions, enumList, historyAction, validateEnumMember } from "../core/functions/enumeration.js";
import { DOMExceptionWithCause } from "../core/exceptions.js";
import { Feature } from "../core/component/feature.js";
import { CancelablePromise } from "../core/process/cancelable-promise.js";
import { NetworkResourceDeniedException, NetworkResourceNotFoundException } from "../core/network/exceptions.js";
import { Component } from "../core/component/component.js";
import { ComponentCollection } from "../core/component/component-collection.js";
import { Form } from "../element/form/form.js";
import { Menu } from "../element/menu.js";
import { alertModal } from "../element/custom-elements/dialog.js";
import { networkRequest } from "../process/network-request.js";
import { notificationsCenter } from "../components/site-notifications.js";
import { fullscreen } from "../components/fullscreen.js";
import { Popup } from "../components/popover.js";
import { Template } from "./template.js";
import { siteHashesRegistry } from "./site-hashes-registry.js";
import { Presentation, PresentationCollection, schemaToElementRepresentative } from "./presentation.js";
import { landingDatabaseManager } from "../../var/indexed-databases.js";
import { userPaths } from "../../var/paths.js";
//#todo
// eslint-disable-next-line no-unused-vars
import { bodyArea } from "../../demo/helpers/body-area.js";

export const siteComponents = new ComponentCollection;

export const sitePresentations = new PresentationCollection;

export class SiteComponent extends Component {
    static #categories = enumList({
        standard: "standard",
        main: "main",
        page: "page",
    }, "siteComponentCategories");
    #feature;
    #category;
    constructor(feature, { category = SiteComponent.#categories.standard, name } = {}) {
        validateVarInterface(feature, Feature);
        validateEnumMember(category, SiteComponent.#categories._name);
        super(feature, { name });
        this.#feature = feature;
        this.#category = category;
        siteComponents.add(this);
    }
    get feature() {
        return this.#feature;
    }
    get featureContent() {
        return this.#feature.content;
    }
    static get categories() {
        return this.#categories;
    }
    get category() {
        return this.#category;
    }
    get element() {
        return this.#feature.element;
    }
    get supportsStateParams() {
        return !this.#feature.isHTMLElement
            && "getState" in this.#feature.content
            && "setState" in this.#feature.content;
    }
    get stateParams() {
        if (this.supportsStateParams) {
            return this.#feature.content.getState();
        } else {
            return Object.create(null);
        }
    }
    set stateParams(params) {
        if (this.supportsStateParams) {
            this.#feature.content.setState(params);
        }
    }
    get stateDescription() {
        const description = {};
        description[this.id] = this.stateParams;
        return description;
    }
}

export const Site = (() => {
    let isInitialized = false;
    let state = {
        presentation: null,
        hash: location.hash.substring(1) || null,
        components: null,
        mainComponent: null,
        main: null,
        url: null,
    };
    let artificialURL;
    let previousState;
    let presentation;
    let landingPayload;
    const authentication = {
        isAuthenticated: false
    };
    let reauthPopup;
    let supportsAuthentication;
    let lockDocumentObserver;
    const endpoints = {};
    function raiseMessage(text, title, { error } = {}) {
        let content;
        if (!error) {
            content = createElement("p", { text });
        } else {
            ([content] = createDetailsElement(text, error.toString()));
        }
        const menu = new Menu({ headingText: "Options" });
        const [, , button] = menu.appendButton("Reload Page", "reload");
        button.addEventListener("click", () => {
            location.reload();
        });
        const popup = new Popup(content, {
            title,
            includeCloseButton: false
        });
        popup.show();
        menu.appendTo(popup.body);
        if (error) {
            console.error(error);
        }
    }
    function raiseCriticalErrorMessage(text, { error } = {}) {
        raiseMessage(text, "Critical Error", { error });
    }
    function validatePayloadStatus(data) {
        if (typeof data !== "object") {
            throw new DOMException("Payload data must be an object.", "PayloadError");
        }
        if (!Object.hasOwn(data, "status")) {
            const message = "Payload does not contain the status element.";
            throw new DOMException(message, "PayloadError");
        }
        if (data.status === 0) {
            const message = data.message || "An error has occurred.";
            throw new DOMException(message, "PayloadStatusError");
        }
        return true;
    }
    function importPayload(data, { authenticationChange = false } = {}) {
        if (!Object.hasOwn(data, "endpoints")) {
            const message = "Payload is missing endpoints data.";
            throw new DOMException(message, "PayloadError");
        }
        if (supportsAuthentication) {
            if (!Object.hasOwn(data, "authentication")) {
                const message = "Payload is missing authentication data.";
                throw new DOMException(message, "PayloadError");
            }
            if (!authenticationChange) {
                writeAuthenticationDetails(data.authentication);
            } else {
                const newIsAuthenticated = data.authentication.isAuthenticated;
                if (newIsAuthenticated && !authentication.isAuthenticated) {
                    modifyAuthenticationDetails(data.authentication);
                } else if (!newIsAuthenticated && authentication.isAuthenticated) {
                    clearAuthenticationDetails();
                }
            }
            endpoints.login = data.endpoints.login;
            if (data.endpoints?.logout) {
                endpoints.logout = data.endpoints.logout;
            }
        }
        endpoints.home = data.endpoints.home;
        if (Object.hasOwn(data, "artificialURL")) {
            artificialURL = data.artificialURL;
        }
        if (Object.hasOwn(data, "saveUser") && data.saveUser && data?.data?.user) {
            manager.storeSavedUser(data.data.user);
        }
        return true;
    }
    function loadLandingPayload() {
        const elem = document.getElementById("landing-data");
        let data;
        if (elem) {
            try {
                data = JSON.parse(elem.text);
            } catch (error) {
                const message = "Could not parse landing data.";
                throw new DOMExceptionWithCause(message, "PayloadError", error);
            }
            elem.remove();
        } else {
            throw new DOMException("Landing data was not found.", "PayloadError");
        }
        validatePayloadStatus(data);
        landingPayload = data;
        importPayload(landingPayload);
        return true;
    }
    function handlePayloadOperations(func) {
        try {
            func();
        } catch (error) {
            if (error.name === "PayloadError") {
                raiseCriticalErrorMessage(error.message, { error: error.cause });
                return false;
            } else if (error.name === "PayloadStatusError") {
                alertModal(error.message);
                return false;
            } else {
                throw error;
            }
        }
        return true;
    }
    const authStateBroadcasting = new BroadcastChannel("authState");
    function updateState(params, { replace = true } = {}) {
        const oldState = structuredClone(state);
        state = { ...state, ...params };
        if (replace) {
            console.log(
                "%creplace (update state)", "background:orange;color:black",
                structuredClone(state),
                params.url || location.href
            );
            history.replaceState(state, "", params.url || location.href);
        }
        document.dispatchEvent(new CustomEvent("stateupdate", {
            detail: { newState: structuredClone(state), oldState }
        }));
        console.log("state", structuredClone(state));
    }
    function pushOrReplace(action, newState, url) {
        previousState = Object.assign({}, state);
        newState.url = String(url);
        const params = [newState, "", url];
        if (action === historyAction.push) {
            history.pushState(...params);
            console.log("%cpush", "background:blue", Object.assign({}, newState), String(url));
        } else {
            history.replaceState(...params);
            console.log("%creplace", "background:lightseagreen", Object.assign({}, newState));
        }
        updateState(newState, { replace: false });
    }
    function push(state, url) {
        pushOrReplace(historyAction.push, state, url);
    }
    function replace(state, url) {
        pushOrReplace(historyAction.replace, state, url);
    }
    function modifyByState(newState, { origin } = {}) {
        if (newState.presentation !== state.presentation) {
            const backupPresentation = sitePresentations.get(newState.presentation);
            if (backupPresentation) {
                endPresentation();
                changePresentation(backupPresentation);
                presentation.start(newState.main, { origin });
            } else {
                const template = determineTemplateFromSchema(newState.main);
                endPresentation();
                const [newPresentation] = buildPresentation(template, newState.main);
                usePresentation(newPresentation);
            }
        } else {
            // It's a different main component
            if (newState.mainComponent !== state.mainComponent) {
                const backupComponent = siteComponents.get(newState.mainComponent);
                if (!backupComponent) {
                    throw new TypeError("Component not found", "NotFound");
                }
                presentation.setMainComponent(backupComponent, newState.main, { origin });
            } else {
                // Updates state parameters for each component
                for (const id of Object.keys(state.components)) {
                    if (Object.hasOwn(newState.components, id)) {
                        if (!compareTwoObjects(state.components[id], newState.components[id])) {
                            const component = siteComponents.get(Number(id));
                            component.featureContent.setState(newState.components[id]);
                        }
                    }
                }
            }
        }
        // Even though some of the commands above will trigger state updates, it should be updated fully.
        updateState(newState);
    }
    function determineTemplateFromSchema(data) {
        const template = issueHookEvent("determinetemplate", { data }, "result", Template);
        if (template) {
            return template;
        } else {
            return presentation.template;
        }
    }
    function updateComponents(components) {
        const newComponents = Object.create(null);
        for (const component of components) {
            newComponents[component.id] = component.stateParams;
            component.content.addEventListener("stateparamschange", e => {
                newComponents[component.id] = e.detail.params;
                updateState({ components: newComponents });
            });
        }
        updateState({ components: newComponents });
    }
    function usePresentation(newPresentation) {
        changePresentation(newPresentation);
        if (presentation.mainComponent) {
            bindMainComponent(presentation.mainComponent);
        }
        presentation.view.addEventListener("componentlistchange", e => {
            if (!presentation.isEnding) {
                updateComponents(e.detail.components);
            }
        });
        for (const component of presentation.view.components) {
            component.featureContent.addEventListener("stateparamschange", e => {
                const newComponents = Object.assign({}, state.components);
                newComponents[component.id] = e.detail.params;
                updateState({ components: newComponents });
            });
        }
        sitePresentations.add(newPresentation);
    }
    function buildPresentation(template, data, { origin } = {}) {
        const presentation = new Presentation(document, template);
        const stateParams = {
            presentation: presentation.id,
            components: {},
            mainComponent: undefined,
            main: undefined,
            hash: undefined,
            url: artificialURL || location.href,
        };
        const components = presentation.start(data);
        for (const component of components) {
            stateParams.components[component.id] = component.stateParams;
        }
        if ("presentation" in data) {
            const mainComponent = presentation.setMainData(data, { origin });
            stateParams.components[mainComponent.id] = mainComponent.stateParams;
            stateParams.mainComponent = mainComponent.id;
        } else {
            stateParams.mainComponent = undefined;
        }
        stateParams.main = data;
        return [presentation, stateParams];
    }
    function endPresentation() {
        if (presentation) {
            presentation.end();
        }
    }
    function changePresentation(newPresentation) {
        presentation = newPresentation;
        document.dispatchEvent(new CustomEvent("newpresentation", {
            detail: { presentation: newPresentation }
        }));
        siteHashesRegistry.setPresentation(newPresentation);
    }
    function bindMainComponent(component) {
        const content = component.featureContent;
        if (content instanceof Form) {
            content.sendOnSubmit = true;
            content.addEventListener("output", e => {
                const { payload } = e.detail;
                manager.setMain(content.url, payload);
            });
        }
    }
    function raiseAlertModal(message) {
        const dialogOptions = { classes: ["danger"] };
        if (userPaths?.stylesheets?.dialog) {
            dialogOptions.stylesheet = userPaths.stylesheets.dialog;
        }
        alertModal(message, dialogOptions);
    }
    window.addEventListener("popstate", e => {
        if (e.state !== null) {
            console.log("popstate", structuredClone(e.state));
            try {
                modifyByState(structuredClone(e.state), { origin: "popstate" });
            } catch (error) {
                raiseAlertModal("Page has expired");
                console.error(error);
            }
        }
    });
    function postAuthenticationChangeMessages(authState, {
        details, broadcast = true, showNotification = true, dispatchEvent = true
    } = {}) {
        const detail = { state: authState };
        if (details) {
            detail.details = details;
        }
        if (broadcast) {
            authStateBroadcasting.postMessage(detail);
        }
        if (dispatchEvent) {
            document.dispatchEvent(new CustomEvent("authstatechange", { detail }));
        }
        if (showNotification) {
            let messageText;
            if (authState) {
                messageText = "You have been logged in";
            } else {
                messageText = "You have been logged out";
            }
            notificationsCenter.sendText(messageText);
        }
    }
    function writeAuthenticationDetails(details) {
        objectUnassign(authentication);
        Object.assign(authentication, details);
    }
    function clearAuthenticationDetails({
        broadcast = true, showNotification = true, dispatchEvent = true
    } = {}) {
        const oldIsAuthenticated = authentication.isAuthenticated;
        writeAuthenticationDetails({ isAuthenticated: false });
        // deauthenticated
        if (oldIsAuthenticated) {
            removeClasses(document.body, "authenticated");
            postAuthenticationChangeMessages(false, {
                broadcast, showNotification, dispatchEvent
            });
        }
    }
    function modifyAuthenticationDetails(details, {
        broadcast = true, showNotification = true, dispatchEvent = true
    } = {}) {
        const oldIsAuthenticated = authentication.isAuthenticated;
        writeAuthenticationDetails(details);
        // authenticated
        authentication.isAuthenticated = true;
        if (!document.body.classList.contains("authenticated")) {
            document.body.classList.add("authenticated");
        }
        if (!oldIsAuthenticated) {
            postAuthenticationChangeMessages(true, {
                details, broadcast, showNotification, dispatchEvent
            });
        }
    }
    function lockDocument(exclude = []) {
        const validateElement = child => {
            return child.nodeType === Node.ELEMENT_NODE
                && child.tagName !== "SCRIPT"
                && !arrayContainsElement(exclude, child);
        }
        for (const child of document.body.children) {
            if (validateElement(child)) {
                child.setAttribute("inert", "");
            }
        }
        lockDocumentObserver = onChildListChange(document.body, ({ addedNodes }) => {
            for (const addedNode of addedNodes) {
                if (validateElement(addedNode)) {
                    addedNode.setAttribute("inert", "");
                }
            }
        });
    }
    function unlockDocument() {
        for (const child of document.body.children) {
            if (child.hasAttribute("inert")) {
                child.removeAttribute("inert");
            }
        }
        if (lockDocumentObserver) {
            lockDocumentObserver.disconnect();
            lockDocumentObserver = undefined;
        }
    }
    function authenticationLost() {
        const wrapper = createElement("div");
        reauthPopup = new Popup(wrapper, {
            title: "Session Expired",
            includeCloseButton: false
        });
        reauthPopup.element.id = "reauth-popup";
        reauthPopup.show();
        lockDocument([reauthPopup.element]);
        const abortController = new AbortController;
        const cancelablePromise = networkRequest(endpoints.login, abortController, {
            processCategory: "main",
        });
        const infoToggler = cancelablePromise.process.createInfoToggler();
        wrapper.append(infoToggler);
        cancelablePromise.then(data => {
            const form = schemaToElementRepresentative(data);
            if (form instanceof Form) {
                form.appendTo(wrapper);
                form.addEventListener("output", e => {
                    const { payload } = e.detail;
                    const operations = () => {
                        validatePayloadStatus(payload);
                        importPayload(payload, { authenticationChange: true });
                    }
                    const validation = handlePayloadOperations(operations);
                    if (validation) {
                        removeReauthPopup();
                        unlockDocument();
                    }
                });
            } else {
                console.error("Element representative must be a form");
            }
        });
    }
    function removeReauthPopup() {
        if (reauthPopup) {
            reauthPopup.remove();
            reauthPopup = undefined;
        }
    }
    function registerTemplateHashes(template) {
        if ("hashes" in template && typeof template.hashes === "function") {
            for (const [name, { onEnter, onLeave }] of template.hashes()) {
                siteHashesRegistry.register(name, onEnter, onLeave);
            }
        }
    }
    // eslint-disable-next-line no-unused-vars
    function unregisterTemplateHashes(template) {
        if ("hashes" in template && typeof template.hashes === "function") {
            for (const [name] of template.hashes()) {
                siteHashesRegistry.unregister(name);
            }
        }
    }
    authStateBroadcasting.addEventListener("message", e => {
        const { state: authState } = e.data;
        console.log("Broadcasted auth state", authState, e.data);
        if (authState !== authentication.isAuthenticated) {
            if (!authState) {
                clearAuthenticationDetails();
                authenticationLost();
            } else {
                const { details } = e.data;
                modifyAuthenticationDetails(details, { broadcast: false });
                removeReauthPopup();
                unlockDocument();
                manager.navigateTo(endpoints.home);
            }
        }
    });
    const manager = {
        get state() {
            return Object.assign({}, state);
        },
        get isAuthenticated() {
            return authentication.isAuthenticated;
        },
        get authenticationDetails() {
            return Object.assign({}, authentication);
        },
        get landingPayload() {
            return landingPayload;
        },
        get currentURLCopy() {
            return new URL(location.href);
        },
        get URLSearchParams() {
            return new URLSearchParams(location.search);
        },
        hasQueryParam(name) {
            return this.URLSearchParams.has(name);
        },
        getQueryParam(name) {
            return this.URLSearchParams.get(name);
        },
        switchTemplate(newTemplate, data) {
            validateVarInterface(newTemplate, Template);
            if (newTemplate.constructor.name !== presentation.template.constructor.name) {
                endPresentation();
                const [newPresentation, stateParams] = buildPresentation(newTemplate, data);
                updateState(stateParams);
                usePresentation(newPresentation);
            }
        },
        setHash(name, { action = historyAction.push } = {}) {
            const newState = this.state;
            newState.hash = name;
            const url = this.currentURLCopy;
            const oldURL = url.toString();
            url.hash = `#${name}`;
            pushOrReplace(action, newState, url);
            window.dispatchEvent(new HashChangeEvent("hashchange", {
                oldURL,
                newURL: url.toString(),
                origin: "internal"
            }));
        },
        pushHash(name) {
            this.setHash(name);
        },
        unsetHash({ action = historyAction.push } = {}) {
            if (location.hash) {
                const newState = this.state;
                newState.hash = null;
                const url = this.currentURLCopy;
                const oldURL = url.toString();
                url.hash = "";
                pushOrReplace(action, newState, url);
                window.dispatchEvent(new HashChangeEvent("hashchange", {
                    oldURL,
                    newURL: url.toString(),
                    origin: "internal",
                }));
            }
        },
        popHash() {
            this.unsetHash();
        },
        setMain(url, data, { action = historyAction.push } = {}) {
            console.log("set main", String(url), data);
            let operation = validatePayloadStatus.bind(this, data);
            let validation = handlePayloadOperations(operation);
            if (!validation) {
                return false;
            }
            let stateURL = url;
            if (Object.hasOwn(data, "artificialURL")) {
                artificialURL = data.artificialURL;
                stateURL = data.artificialURL;
            }
            const newTemplate = determineTemplateFromSchema(data);
            if (newTemplate.constructor.name !== presentation.template.constructor.name) {
                endPresentation();
                const [newPresentation, stateParams] = buildPresentation(newTemplate, data);
                pushOrReplace(action, stateParams, stateURL);
                usePresentation(newPresentation);
            } else {
                const mainComponent = presentation.buildComponentFromData(data);
                bindMainComponent(mainComponent);
                const newState = this.state;
                newState.main = data;
                newState.mainComponent = mainComponent.id;
                pushOrReplace(action, newState, stateURL);
                presentation.setMainComponent(mainComponent, data);
            }
            const wasAuthenticated = authentication.isAuthenticated;
            operation = importPayload.bind(this, data, { authenticationChange: true });
            validation = handlePayloadOperations(operation);
            if (!wasAuthenticated && authentication.isAuthenticated && endpoints.customHome) {
                //#todo
                // this.navigateTo(endpoints.home, { action: historyAction.replace });
            }
            if (!validation) {
                return false;
            }
            siteHashesRegistry.checkCurrent();
            return true;
        },
        setMainComponent(url, component, { data = {}, action = historyAction.push } = {}) {
            validateVarInterface(component, SiteComponent, { paramNumber: 2 });
            bindMainComponent(component);
            const newState = this.state;
            newState.main = data;
            newState.mainComponent = component.id;
            pushOrReplace(action, newState, url);
            presentation.setMainComponent(component, data);
        },
        setPreviousState() {
            modifyByState(previousState, { origin: "previousstate" });
            push(previousState, previousState.url);
        },
        navigateFromRequestParams(params, { action = historyAction.push, reloadSame = false } = {}) {
            let { url, handle, options } = params;
            url = new URL(url, location.href);
            const currentURL = this.currentURLCopy;
            // Does not compare query string and hash
            const urlComparison = compareTwoUrls(currentURL, url, {
                compareQueryString: false,
                compareHash: false,
            });
            const stripHashPrefix = value => {
                return value.startsWith("#") ? value.substring(1) : value;
            }
            const oldHash = stripHashPrefix(currentURL.hash);
            const newHash = stripHashPrefix(url.hash);
            // Same URL
            if (urlComparison) {
                // "" -> #hash
                if (oldHash === "" && newHash !== "") {
                    this.setHash(newHash);
                    return url;
                // #hash -> ""
                } else if (oldHash !== "" && newHash === "") {
                    if (!reloadSame) {
                        this.unsetHash();
                        return url;
                    } else {
                        window.dispatchEvent(new HashChangeEvent("hashchange", {
                            oldURL: currentURL.toString(),
                            newURL: url.toString(),
                            origin: "internal"
                        }));
                    }
                // #hash1 -> #hash2
                } else if (oldHash !== "" && newHash !== "" && oldHash !== newHash) {
                    this.setHash(newHash);
                    return url;
                // "" -> ""
                } else if (oldHash === "" && newHash === "") {
                    if (!reloadSame) {
                        return url;
                    }
                // #hash -> #hash
                } else if (oldHash === oldHash) {
                    if (!reloadSame) {
                        return url;
                    } else {
                        const newURL = new URL(url);
                        newURL.hash = "";
                        window.dispatchEvent(new HashChangeEvent("hashchange", {
                            oldURL: currentURL.toString(),
                            newURL: newURL.toString(),
                            origin: "internal"
                        }));
                    }
                }
            } else {
                if (oldHash !== "") {
                    const newURL = new URL(currentURL);
                    newURL.hash = "";
                    window.dispatchEvent(new HashChangeEvent("hashchange", {
                        oldURL: currentURL.toString(),
                        newURL: newURL.toString(),
                        origin: "internal"
                    }));
                }
            }
            const requestURL = new URL(url);
            requestURL.searchParams.set("format", "json");
            options.throwStatusErrors = true;
            options.trackDownloadProgress = false;
            options.processCategory = "main";
            const cancelablePromise = networkRequest(requestURL, handle, options);
            cancelablePromise.then(data => {
                this.setMain(url, data, { action });
            }).catch(error => {
                if (error instanceof NetworkResourceNotFoundException) {
                    raiseAlertModal("Location not found");
                } else if (error instanceof NetworkResourceDeniedException) {
                    raiseAlertModal("Access denied");
                }
                console.error("Navigation error:", error);
            });
            return cancelablePromise;
        },
        navigateTo(url, {
            timeout = 10_000,
            handle = new AbortController,
            action = historyAction.push,
            reloadSame = false,
        } = {}) {
            return this.navigateFromRequestParams({
                url, handle, options: { timeout }
            }, {
                action, reloadSame
            });
        },
        createNavigationHyperlink(url, content, attrs = {}) {
            const hyperlink = createHyperlink(url, content, attrs);
            hyperlink.addEventListener("click", e => {
                if (e.target.isConnected) {
                    const navigateResult = this.navigateTo(url);
                    if (navigateResult) {
                        e.preventDefault();
                        if (navigateResult instanceof CancelablePromise) {
                            const cancelablePromise = navigateResult;
                            const process = cancelablePromise.process;
                            process.attachToElement(hyperlink);
                            process.delayedInfoToggler(hyperlink, {
                                adjacency: adjacencyPositions.afterbegin,
                                tag: "span"
                            });
                        }
                    }
                } else {
                    console.error("Only connected hyperlinks can initiate navigation");
                }
            });
            return hyperlink;
        },
        pushQueryParams(params, componentElement, { action = historyAction.push } = {}) {
            const component = siteComponents.findFirstByProperty("featureContent", componentElement);
            if (!component) {
                throw new DOMException("Component was not found");
            }
            const url = this.currentURLCopy;
            let changedCount = 0;
            for (const [name, value] of Object.entries(params)) {
                if (!url.searchParams.has(name, value)) {
                    url.searchParams.set(name, value);
                    changedCount++;
                }
            }
            const newState = this.state;
            newState.components[component.id] = component.featureContent.getState();
            if (action === historyAction.push) {
                push(newState, url);
            } else {
                replace(newState, url);
            }
            if (changedCount !== 0) {
                const oldURLSearchParams = this.URLSearchParams;
                window.dispatchEvent(new CustomEvent("locationsearchchange", {
                    detail: { newURLSearchParams: url.searchParams, oldURLSearchParams }
                }));
            }
        },
        pushQueryParam(name, value, componentElement) {
            const params = Object.create(null);
            params[name] = value;
            return this.pushQueryParams(params, componentElement);
        },
        replaceQueryParam(name, value, componentElement) {
            const params = Object.create(null);
            params[name] = value;
            return this.pushQueryParams(params, componentElement, {
                action: historyAction.replace,
            });
        },
        popQueryParams(params, componentElement) {
            const component = siteComponents.findFirstByProperty("featureContent", componentElement);
            if (!component) {
                throw new DOMException("Component was not found");
            }
            const url = this.currentURLCopy;
            let removedCount = 0;
            for (const name of params) {
                if (url.searchParams.has(name)) {
                    url.searchParams.delete(name);
                    removedCount++;
                }
            }
            if (removedCount !== 0) {
                const newState = this.state;
                newState.components[component.id] = component.featureContent.getState();
                push(newState, url);
                const oldURLSearchParams = this.URLSearchParams;
                window.dispatchEvent(new CustomEvent("locationsearchchange", {
                    detail: { newURLSearchParams: url.searchParams, oldURLSearchParams }
                }));
            }
        },
        popQueryParam(name, componentElement) {
            return this.popQueryParams([name], componentElement);
        },
        getURLQueryParamsPublisher() {
            const that = this;
            return {
                pushOne(name, value, { component } = {}) {
                    that.pushQueryParam(name, value, component);
                },
                pushMany(params, { component } = {}) {
                    that.pushQueryParams(params, component);
                },
                replaceOne(name, value, { component } = {}) {
                    that.replaceQueryParam(name, value, component);
                },
                replaceMany(params, { component } = {}) {
                    that.pushQueryParams(params, component, {
                        action: historyAction.replace,
                    });
                },
                popOne(name, { component } = {}) {
                    that.popQueryParam(name, component);
                },
                popMany(params, { component } = {}) {
                    that.popQueryParams(params, component);
                }
            }
        },
        getHyperlinkBuilder() {
            const buildHyperlink = (url, content, attrs = {}) => {
                return this.createNavigationHyperlink(url, content, attrs);
            }
            return { buildHyperlink };
        },
        init({ templateConstructor, supportsAuthentication: supportsAuth = false } = {}) {
            if (isInitialized) {
                throw new DOMException("Site has been already initialized");
            }
            supportsAuthentication = supportsAuth;
            if (!handlePayloadOperations(loadLandingPayload)) {
                return false;
            }
            let template;
            if (!templateConstructor) {
                template = determineTemplateFromSchema(landingPayload);
            } else {
                template = new templateConstructor(landingPayload);
                registerTemplateHashes(template);
            }
            endPresentation();
            const [newPresentation, stateParams] = buildPresentation(template, landingPayload);
            updateState(stateParams);
            usePresentation(newPresentation);
            fullscreen.enableNotifications();
            siteHashesRegistry.checkCurrent();
            document.addEventListener("copytoclipboard", () => {
                notificationsCenter.sendText(`Wrote text to clipboard`);
            });
            document.addEventListener("copytoclipboarderror", () => {
                notificationsCenter.sendParams(`Failed to write text to clipboard`, {
                    type: "error"
                });
            });
            isInitialized = true;
        },
        endPresentation() {
            endPresentation();
        },
        validatePayloadStatus(data) {
            return validatePayloadStatus(data);
        },
        handlePayloadOperations(func) {
            return handlePayloadOperations(func);
        },
        registerTemplateHashes(template) {
            registerTemplateHashes(template);
        },
        async storeSavedUser(userData) {
            const blob = blobFromBase64(userData.image);
            const userId = userData.id;
            await landingDatabaseManager.saveValue("savedUsers", userId, {
                id: userId,
                image: blob,
                name: userData.title,
                username: userData.name,
                timeCreated: Date.now(),
            });
        }
    }
    Object.seal(manager);
    return manager;
})();