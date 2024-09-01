"use strict";

import { isIterable, isNullish, validateVarInterface } from "./misc.js";
import { isNonNullObject, namedNodeMapToObject } from "./object.js";
import { adjacencyPositions, validateEnumMember } from "./enumeration.js";
import { imageElementFromURL } from "./image.js";

/**
 * Creates a new HTML element
 * @param {string} tagName - HTML element's tag name
 * @param {object} options - Options: classes, text, html, id, attrs, title, elems
 * @param {object} refs - Object which will be modified to store references to created elements. Works when "elems" option is used with "ref" parameter.
 * @returns {HTMLElement}
 */
export function createElement(tagName, options = {}, refs = {}) {
    const el = document.createElement(tagName);
    for (const [key, value] of Object.entries(options)) {
        if (value === undefined) {
            continue;
        }
        switch (key) {
            case "classes":
                if (isIterable(value) && ((Array.isArray(value) && value.length) || !Array.isArray(value))) {
                    el.classList.add(...value);
                }
                break;
            case "text":
                el.innerText = value;
                break;
            case "html":
                el.innerHTML = value;
                break;
            case "id":
                if (typeof value === "string") {
                    el.id = value;
                }
                break;
            case "attrs":
                for (const [name, content] of Object.entries(value)) {
                    el.setAttribute(name, content);
                }
                break;
            case "title":
                el.title = value;
                break;
            case "elems":
                for (const element of value) {
                    if (element instanceof Node) {
                        el.append(element);
                    } else if (element instanceof DocumentFragment) {
                        el.append(...element.children);
                    } else if (isNonNullObject(element)) {
                        const { tag: tagName, options, text, node, ref } = element;
                        const hasText = typeof text === "string";
                        const hasNode = node instanceof Node;
                        let innerEl;
                        if (!hasText && !hasNode) {
                            innerEl = createElement(tagName, options, refs);
                        } else if (hasText) {
                            innerEl = document.createTextNode(text);
                        } else if (hasNode) {
                            innerEl = node;
                        }
                        if (innerEl) {
                            if (ref) {
                                refs[ref] = innerEl;
                            }
                            el.append(innerEl);
                        }
                    }
                }
                break;
        }
    }
    return el;
}

/**
 * Creates a simple HTML button element with the specified text and optional CSS classes.
 *
 * @param {string} text - The text content of the button.
 * @param {string[]} [classes=[]] - An array of CSS classes to apply to the button.
 * @returns {HTMLButtonElement} The created button element.
 */
export function createSimpleButton(text, classes = []) {
    return createElement("button", {
        text,
        classes,
        attrs: {
            type: "button"
        }
    });
}

/**
 * Creates a hyperlink element with the specified URL, content, and attributes.
 *
 * @param {string} url - The URL for the hyperlink.
 * @param {string|Element} content - The content to display within the hyperlink.
 *                                   If an Element is provided, it is used directly as content.
 * @param {Object} [attrs={}] - Additional attributes to set on the hyperlink element.
 * @returns {Element} The created <a> element with the specified URL, content, and attributes.
 */
export function createHyperlink(url, content, attrs = {}) {
    attrs.href = url;
    const options = { attrs };
    if (!(content instanceof Element)) {
        options.html = content;
    } else {
        options.elems = [content];
    }
    return createElement("a", options);
}

/**
 * Creates a <details> element with a summary and contents.
 *
 * @param {string} summary - The summary text or HTML for the <summary> element.
 * @param {string|Node} contents - The contents to display within the <details> element.
 *                                 If a Node (e.g., HTMLElement) is provided, it is used directly as contents.
 * @param {Object} options - Options object.
 * @param {string[]} [options.classes=[]] - Array of CSS classes to apply to the <details> element.
 * @param {boolean} [options.open=false] - Whether the <details> element should be open by default.
 * @returns {[Element, Object]} An array where the first element is the created <details> element,
 *                              and the second element is an object containing references to child elements.
 */
export function createDetailsElement(summary, contents, { classes = [], open = false } = {}) {
    const refs = {};
    const summaryConfig = {
        tag: "summary",
        options: {
            text: summary
        },
        ref: "summary"
    };
    let contentsConfig;
    if (contents instanceof Node) {
        contentsConfig = { node: contents, ref: "contents" };
    } else {
        contentsConfig = { text: String(contents), ref: "contents" };
    }
    const config = {
        classes,
        elems: [summaryConfig, contentsConfig]
    }
    if (open) {
        config.attrs = { open: "" }
    }
    const details = createElement("details", config, refs);
    return [details, refs];
}

/**
 * Checks if the given element is active, i.e., it is an instance of Element and is either connected to the DOM or part of the document body.
 *
 * @param {Element} el - The element to check.
 * @returns {boolean} True if the element is active, otherwise false.
 */
export function isElementActive(el) {
    return el instanceof Element && (el.isConnected || document.body.contains(el));
}

/**
 * Returns a Promise that resolves when the specified element is removed from its parent element.
 *
 * @param {Element} el - The element to track for removal.
 * @returns {Promise<void>} A Promise that resolves when the element is removed.
 * @throws {DOMException} Throws a DOMException if the element does not have a parent element.
 */
export function onElementRemove(el) {
    // Promise works here, because element can be removed just once
    return new Promise((resolve, reject) => {
        if (!el.parentElement) {
            reject(new DOMException("Element with removal tracking requires a parent element"));
        }
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.removedNodes) {
                    const removedNodes = Array.from(mutation.removedNodes);
                    if (removedNodes.includes(el)) {
                        resolve();
                    }
                }
            });
        });
        try {
            observer.observe(
                el.parentElement,
                // When subtree is not set to true, this will monitor direct child nodes under the target element
                { childList: true }
            );
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Inserts a new element at the specified position within a parent element.
 * If the position is out of range, the new element is appended to the end.
 *
 * @param {HTMLElement} parent - The parent element where the new element will be inserted.
 * @param {HTMLElement} newElement - The new element to be inserted.
 * @param {number} position - The position at which the new element should be inserted (zero-based index).
 * @returns {HTMLElement} The inserted element.
 */
export function insertElementAt(parent, newElement, position) {
    const children = parent.children;
    if (position >= 0 && position < children.length) {
        return parent.insertBefore(newElement, children[position]);
    } else {
        // If the position is out of range, you can append the new element to the end.
        return parent.appendChild(newElement);
    }
}

/**
 * Converts a value into an HTML element, allowing customization based on the value's type.
 *
 * @param {*} value - The value to be converted into an HTML element.
 * @param {string} [defaultTag="span"] - The HTML tag to use when creating an element for non-special values.
 * @returns {HTMLElement} An HTML element representing the value.
 */
export function valueToElement(value, defaultTag = "span") {
    if (value instanceof HTMLElement) {
        return value;
    } else if (value instanceof DocumentFragment) {
        return createElement(defaultTag, {
            elems: [{ node: value }]
        });
    } else if (value instanceof Blob) {
        return imageElementFromURL(URL.createObjectURL(value));
    } else if (value instanceof Date) {
        return createElement("time", {
            text: value.toString(),
            attrs: {
                datetime: value.toISOString()
            }
        });
    } else if (isNonNullObject(value) && Object.hasOwn(value, "value")) {
        return valueToElement(value.value);
    } else {
        const options = {};
        if (isNullish(value) || typeof value === "boolean") {
            options.text = "";
        } else if (typeof value === "number") {
            options.text = String(value);
        } else {
            options.html = String(value);
        }
        return createElement(defaultTag, options);
    }
}

/**
 * Converts an iterable collection into DOM elements and appends them to a container element.
 *
 * @param {Iterable} iterable - The iterable collection to convert to DOM elements.
 * @param {Element} [container] - Optional container element to append the converted elements. If not provided, a new <div> element is created.
 * @returns {Element} The container element populated with converted DOM elements.
 */
export function iterableToElement(iterable, container) {
    if (!container) {
        container = createElement("div");
    }
    for (const value of iterable) {
        if (typeof value !== "function") {
            container.append(valueToElement(value));
        } else {
            container.append(value());
        }
    }
    return container;
}

/**
 * Checks if an HTML element is currently in fullscreen mode.
 *
 * @param {Element} el - The HTML element to check for fullscreen status.
 * @returns {boolean} `true` if the element is in fullscreen mode, `false` otherwise.
 */
export function isElementInFullscreen(el) {
    return document.fullscreenElement && document.fullscreenElement === el;
}

/**
 * Find all submit buttons (input type="submit" and button elements) within a given form.
 *
 * @param {HTMLFormElement} form - The form element to search for submit buttons.
 * @returns {HTMLInputElement[] | HTMLButtonElement[]} An array of submit buttons found in the form.
 */
export function findFormSubmitButtons(form) {
    if (!form.elements.length) {
        return [];
    }
    const formControls = Array.from(form.elements);
    const submitButtons = [];
    formControls.forEach(element => {
        if (element.type === "submit" || (element.tagName === "BUTTON" && element.type !== "button")) {
            submitButtons.push(element);
        }
    });
    return submitButtons;
}

/**
 * Disable all submit buttons (input type="submit" and button elements) within a given form.
 *
 * @param {HTMLFormElement} form - The form element containing the submit buttons to disable.
 */
export function disableFormSubmitButtons(form) {
    findFormSubmitButtons(form).forEach(buttonEl => {
        buttonEl.disabled = true;
    });
}

/**
 * Enable all submit buttons (input type="submit" and button elements) within a given form.
 *
 * @param {HTMLFormElement} form - The form element containing the submit buttons to enable.
 */
export function enableFormSubmitButtons(form) {
    findFormSubmitButtons(form).forEach(buttonEl => {
        buttonEl.disabled = false;
    });
}

/**
 * Check if a given node has a specific child node.
 *
 * @param {Node} node - The parent node to search for the child node within.
 * @param {Node} otherNode - The child node to search for.
 * @returns {boolean} Returns true if the parent node contains the specified child node, otherwise false.
 */
export function hasChild(node, otherNode) {
    for (const childNode of node.children) {
        if (childNode === otherNode) {
            return true;
        }
    }
    return false;
}

/**
 * Retrieves the position of a child node relative to its parent's children.
 *
 * @param {Node} node - The parent node containing child nodes.
 * @param {Node} otherNode - The child node whose position is to be retrieved.
 * @returns {number|null} The position index of the child node within its parent's children, or null if not found.
 */
export function getChildPosition(node, otherNode) {
    let position = 0;
    for (const childNode of node.children) {
        if (childNode === otherNode) {
            return position;
        }
        position++;
    }
    return null;
}

/**
 * Check if an HTML element with the given tag name is a self-closing (void) element.
 *
 * @param {string} tagName - The tag name of the HTML element to check.
 * @returns {boolean} True if the element is self-closing, false otherwise.
 */
export function isSelfClosingElement(tagName) {
    /**
     * List of common self-closing (void) element tag names.
     *
     * @type {string[]}
     */
    const selfClosingElements = [
        "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"
    ];
    return selfClosingElements.includes(tagName.toLowerCase());
}

/**
 * Watches for changes to a specific attribute on an element and invokes a callback when changes occur.
 * Returns a controller object with an `unobserve()` method to stop observing the attribute.
 *
 * @param {Element} el - The element to observe.
 * @param {string} attrName - The name of the attribute to observe changes for.
 * @param {function} callback - The callback function to invoke when the attribute changes.
 * @throws {TypeError} Throws an error if the first parameter is not an element or if the callback is not a function.
 * @returns {Object} A controller object with an `unobserve()` method to stop observing the attribute.
 */
export const onAttributeChange = (() => {
    const map = new Map;
    let observer;
    const prepareObserver = () => {
        if (!observer) {
            observer = new MutationObserver(mutationsList => {
                mutationsList.forEach(mutation => {
                    if (map.has(mutation.target)) {
                        const info = map.get(mutation.target);
                        const attrName = mutation.attributeName;
                        if (attrName in info) {
                            const callbacks = info[attrName];
                            const newValue = mutation.target.getAttribute(attrName);
                            const oldValue = mutation.oldValue;
                            for (const callback of callbacks) {
                                callback({ newValue, oldValue, attrName, mutation });
                            }
                        }
                    }
                });
            });
        }
    }
    const startObserving = (el, attributeFilter) => {
        prepareObserver();
        observer.observe(el, { attributes: true, attributeFilter, attributeOldValue: true });
    }
    const stopObserving = el => {
        // Note: MutationObserver does not have an "unobserve" method. The workaround is to launch a new observation, but have the "attributeFilter" option set to an empty array.
        observer.observe(el, { attributes: true, attributeFilter: [], attributeOldValue: true });
    }
    return (el, attrName, callback) => {
        validateVarInterface(el, Element);
        if (typeof callback !== "function") {
            throw new TypeError("Callback must be a function");
        }
        if (!map.has(el)) {
            const info = Object.create(null);
            info[attrName] = [callback];
            map.set(el, info);
            startObserving(el, [attrName]);
        } else {
            const info = map.get(el);
            if (!(attrName in info)) {
                info[attrName] = [callback];
                // Note: calling `observe()` on a node that's already being observed, all existing observers are removed, see: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe#reusing_mutationobservers
                startObserving(el, Object.keys(info));
            } else {
                info[attrName].push(callback);
            }
        }
        const controller = {
            unobserve() {
                const info = map.get(el);
                delete info[attrName];
                const count = Object.keys(info).length;
                if (count === 0) {
                    stopObserving(el);
                }
                return count;
            }
        }
        Object.freeze(controller);
        return controller;
    }
})();

/**
 * Set up a MutationObserver to monitor changes to the child nodes of an element.
 *
 * @param {Element} el - The target element to observe.
 * @param {function} callback - The callback function to be executed when changes are detected.
 * @returns {MutationObserver} The MutationObserver instance.
 *
 * @throws {TypeError} Throws an error if the callback is not a function.
 */
export function onChildListChange(el, callback) {
    if (typeof callback !== "function") {
        throw new TypeError("Callback must be a function");
    }
    /**
     * Callback function for the MutationObserver.
     *
     * @param {MutationRecord[]} mutationsList - List of mutations.
     * @private
     */
    const mutationCallback = mutationsList => {
        mutationsList.forEach(mutation => {
            if (mutation.type === "childList" && (mutation.addedNodes.length || mutation.removedNodes.length)) {
                callback({
                    addedNodes: mutation.addedNodes,
                    removedNodes: mutation.removedNodes
                });
            }
        });
    };
    const observer = new MutationObserver(mutationCallback);
    observer.observe(el, { childList: true });
    return observer;
}


/**
 * Find a unique ID based on a prefix, starting number, and a concatenation divider.
 *
 * @param {string} [prefix="el"] - The prefix for the unique ID.
 * @param {number} [startNumber=1] - The starting number for the unique ID.
 * @param {string} [concatDivider="-"] - The concatenation divider between the prefix and number.
 * @returns {string} A unique ID generated based on the provided parameters.
 */
export function findUniqueId(prefix = "el", startNumber = 1, concatDivider = '-') {
    let number = startNumber;
    while (document.getElementById(prefix.concat(concatDivider, number))) {
        number++;
    }
    return prefix.concat(concatDivider, number);
}

/**
 * Assign a unique ID to an HTML element based on a prefix, starting number, and concatenation divider.
 *
 * @param {HTMLElement} el - The HTML element to assign a unique ID.
 * @param {string} [prefix="el"] - The prefix for the unique ID.
 * @param {number} [startNumber=1] - The starting number for the unique ID.
 * @param {string} [concatDivider="-"] - The concatenation divider between the prefix and number.
 * @returns {void}
 */
export function elementAssignUniqueId(el, prefix, startNumber, concatDivider) {
    const id = findUniqueId(prefix, startNumber, concatDivider);
    el.id = id;
    return id;
}

/**
 * Prepend a child node to a parent node.
 *
 * @param {Node} parent - The parent node to which the child node will be prepended.
 * @param {Node} node - The child node to be prepended.
 * @returns {Node} The prepended child node.
 *
 * @throws {TypeError} Throws an error if either the parent or child is not a valid DOM Node.
 */
export function prependChild(parent, node) {
    validateVarInterface(parent, Node);
    validateVarInterface(node, Node, { paramNumber: 2 });
    return parent.insertBefore(node, parent.firstChild);
}

/**
 * Inserts a node after a reference node in the DOM.
 *
 * @param {Node} node - The node to insert.
 * @param {Node} referenceNode - The reference node after which to insert the new node.
 * @returns {Node} The inserted node.
 */
export function insertAfter(node, referenceNode) {
    if (!referenceNode || !referenceNode.parentNode) {
        return referenceNode.appendChild(node);
    } else {
        return referenceNode.parentNode.insertBefore(node, referenceNode.nextSibling);
    }
}

/**
 * Remove specified CSS classes from an HTML element.
 *
 * @param {Element} el - The HTML element from which to remove classes.
 * @param {string[]} classes - An array of class names to be removed.
 * @throws {TypeError} Throws an error if the first argument is not a valid HTML Element.
 */
export function removeClasses(el, classes) {
    if (!(el instanceof Element)) {
        throw new TypeError("Argument 1 is not an element");
    }
    if (typeof classes === "string") {
        classes = [classes];
    }
    el.classList.remove(...classes);
    // Cleans up the attribute
    if (el.classList.length === 0) {
        el.removeAttribute("class");
    }
}

/**
 * Checks if an HTML element is attached to the DOM (has a parent node).
 *
 * @param {HTMLElement} el - The HTML element to check for attachment.
 * @returns {boolean} Returns `true` if the element is attached, `false` otherwise.
 */
export function isElementAttached(el) {
    return el.parentNode !== null;
}

/**
 * Detaches an HTML element from the DOM if it is attached.
 *
 * @param {HTMLElement} el - The HTML element to detach.
 * @returns {HTMLElement|null} Returns the detached element if it was attached, otherwise returns `null`.
 */
export function detachElement(el) {
    return isElementAttached(el)
        ? el.parentNode.removeChild(el)
        : null;
}


/**
 * Calculates the depth of a given DOM node in the tree relative to a specified root node.
 *
 * @param {Node} node - The DOM node for which to calculate the depth.
 * @param {Node} root - The root node that serves as the reference point for depth calculation.
 * @returns {number} The depth of the node in the tree relative to the root.
 */
export function getNodeDepth(node, root) {
    let depth = 0;
    let currentNode = node;
    while (currentNode !== root && currentNode.parentNode) {
        currentNode = currentNode.parentNode;
        depth++;
    }
    return depth;
}

/**
 * Creates a tree walker that filters elements based on the provided callback function.
 *
 * @param {Node} root - The root node from which to start traversing the DOM.
 * @param {function} callback - The callback function used to filter elements. It should return a boolean.
 * @returns {TreeWalker} - The created TreeWalker instance.
 */
export function createElementFilterWalker(root, callback) {
    return document.createTreeWalker(
        root,
        // Show only elements
        NodeFilter.SHOW_ELEMENT,
        { acceptNode: el => (callback(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) }
    );
}

/**
 * Finds the first element with the smallest depth in the DOM tree that satisfies the provided callback.
 *
 * @param {Node} root - The root node from which to start searching for the element.
 * @param {function} callback - The callback function used to filter elements. It should return a boolean.
 * @returns {Element|null} - The first element with the smallest depth that satisfies the callback, or null if none is found.
 */
export function findFirstElementWithSmallestDepth(root, callback) {
    let result = null;
    let minDepth = Infinity;
    // Create a TreeWalker starting from the root node
    const walker = createElementFilterWalker(root, el => callback(el));
    while (walker.nextNode()) {
        const currentDepth = getNodeDepth(walker.currentNode, root);
        // Check if the current element has the smallest depth so far
        if (currentDepth < minDepth) {
            minDepth = currentDepth;
            result = walker.currentNode;
        }
    }
    return result;
}

/**
 * Binds a change event listener to a file input element and replaces it with a new input element
 * when a file is selected, invoking a callback with the new input.
 *
 * @param {HTMLInputElement} input - The file input element to bind the change event to.
 * @param {function(Event, HTMLInputElement): void} callback - The callback function to invoke when a file is selected.
 * @throws {TypeError} Throws an error if the first parameter is not an HTMLInputElement.
 */
export function bindFileInputChangeAndReplace(input, callback) {
    if (!(input instanceof HTMLInputElement)) {
        throw new TypeError("Parameter #1 must be an input element");
    }
    input.addEventListener("change", e => {
        const newInput = fileInputReplace(input, callback);
        callback(e, newInput);
    });
}

/**
 * Replaces a file input element with a new input element, maintaining its attributes,
 * and binds a change event listener to the new input element.
 *
 * @param {HTMLInputElement} input - The file input element to replace.
 * @param {function(Event, HTMLInputElement): void} callback - The callback function to bind to the new input element.
 * @returns {HTMLInputElement} The newly created input element.
 * @throws {TypeError} Throws an error if the first parameter is not an HTMLInputElement.
 */
export function fileInputReplace(input, callback) {
    const newInput = createElement("input", {
        attrs: namedNodeMapToObject(input.attributes)
    });
    input.replaceWith(newInput);
    bindFileInputChangeAndReplace(newInput, callback);
    return newInput;
}

/**
 * Monitors changes in an element's connection status (connected or disconnected).
 * Returns a controller object with a `removeObserver()` method to stop observing the element.
 *
 * @param {Element} el - The element to observe.
 * @throws {TypeError} Throws an error if the parameter is not an element.
 * @returns {Object} A controller object with a `removeObserver()` method to stop observing the element.
 */
export const onConnectedChange = (() => {
    let observer;
    const map = new Map;
    const prepareObserver = () => {
        if (!observer) {
            observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length !== 0) {
                        for (const addedNode of mutation.addedNodes) {
                            if (addedNode.nodeType === Node.ELEMENT_NODE) {
                                if (map.has(addedNode)) {
                                    const info = map.get(addedNode);
                                    info.isConnected = true;
                                    addedNode.dispatchEvent(new CustomEvent("connected"));
                                }
                            }
                        }
                    }
                    if (mutation.removedNodes.length !== 0) {
                        for (const removedNode of mutation.removedNodes) {
                            if (removedNode.nodeType === Node.ELEMENT_NODE) {
                                if (map.has(removedNode)) {
                                    const info = map.get(removedNode);
                                    info.isConnected = false;
                                    removedNode.dispatchEvent(new CustomEvent("disconnected"));
                                }
                            }
                        }
                    }
                }
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    }
    return el => {
        validateVarInterface(el, Element);
        if (!map.has(el)) {
            map.set(el, { isConnected: el.isConnected, observersCount: 1 });
            prepareObserver();
        } else {
            const info = map.get(el);
            info.observersCount++;
        }
        const controller = {
            removeObserver() {
                const info = map.get(el);
                info.observersCount--;
                if (info.observersCount === 0) {
                    map.delete(el);
                }
                return info.observersCount;
            }
        }
        Object.freeze(controller);
        return controller;
    }
})();

/**
 * Creates a <label> element with specified text and attributes, and adds mouseover and mouseout event listeners
 * to apply a specified class when hovering over the label associated with a form element.
 *
 * @param {string} text - The text content of the label.
 * @param {string} formElId - The ID of the associated form element.
 * @param {Document} [doc=document] - The document context in which to search for the associated form element.
 * @param {Object} options - Options object.
 * @param {string[]} [options.classes=[]] - Array of CSS classes to apply to the label element.
 * @param {string} [options.className="clickable"] - Class name to apply when hovering over the label (default: "clickable").
 * @returns {HTMLLabelElement} The created <label> element with the specified text and attributes.
 */
export function createLabel(text, formElId, doc, { classes = [], className = "clickable" } = {}) {
    const docContext = doc ?? document;
    const options = { text, classes, attrs: {} };
    if (formElId) {
        options.attrs.for = formElId;
    }
    const labelEl = createElement("label", options);
    labelEl.addEventListener("mouseover", () => {
        if (labelEl.hasAttribute("for")) {
            const asscElemId = labelEl.getAttribute("for");
            const formEl = docContext.getElementById(asscElemId);
            if (formEl && !formEl.disabled) {
                labelEl.classList.add(className);
            }
        }
    });
    labelEl.addEventListener("mouseout", () => {
        if (labelEl.classList.contains(className)) {
            removeClasses(labelEl, [className]);
        }
    });
    return labelEl;
}

/**
 * Inserts a node adjacent to a reference node based on the specified position.
 *
 * @param {Node} reference - The reference node to insert adjacent to.
 * @param {Enumeration} position - The position relative to the reference node.
 * @param {Node} node - The node to insert.
 * @throws {TypeError} Throws an error if the position is not a valid enum member.
 * @returns {Node} The inserted node.
 */
export function insertAdjacentNode(reference, position, node) {
    validateEnumMember(position, "adjacencyPositions");
    switch (position) {
        case adjacencyPositions.beforebegin:
            return reference.parentNode.insertBefore(node, reference);
        case adjacencyPositions.afterbegin:
            return prependChild(reference, node);
        case adjacencyPositions.beforeend:
            return reference.appendChild(node);
        case adjacencyPositions.afterend:
            return insertAfter(node, reference);
    }
}

/**
 * Checks if an element is either the root (documentElement) or the body element of the document.
 *
 * @param {Element} elem - The element to check.
 * @throws {TypeError} Throws an error if the parameter is not an Element.
 * @returns {boolean} True if the element is the document's root or body element, false otherwise.
 */
export function isElementRootOrBody(elem) {
    validateVarInterface(elem, Element);
    return elem === document.documentElement || elem === document.body;
}

/**
 * Constrains the attribute of an element to a specified list of allowed values.
 *
 * @param {HTMLElement} elem - The element whose attribute is being constrained.
 * @param {string} attrName - The name of the attribute to constrain.
 * @param {Object} list - An object representing the allowed values for the attribute.
 */
export function constrainAttrTo(elem, attrName, list) {
    onAttributeChange(elem, attrName, ({ oldValue, newValue }) => {
        if (!Object.hasOwn(list, newValue)) {
            if (!isNullish(oldValue)) {
                elem.setAttribute(attrName, oldValue);
            } else {
                elem.removeAttribute(attrName);
            }
        }
    });
}