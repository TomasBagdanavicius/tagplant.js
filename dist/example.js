(function () {
    'use strict';

    /**
     * Checks if a variable is iterable (either sync or async).
     *
     * @param {*} variable - The variable to be checked.
     * @returns {boolean} Returns true if the variable is iterable, otherwise false.
     */
    function isIterable(variable) {
        return Symbol.iterator in Object(variable) || Symbol.asyncIterator in Object(variable);
    }

    /**
     * Checks if a value is a non-null object.
     *
     * @param {*} value - The value to check.
     * @returns {boolean} True if the value is a non-null object, false otherwise.
     */
    function isNonNullObject(value) {
        return typeof value === "object" && value !== null;
    }

    /**
     * Creates a new HTML element
     * @param {string} tagName - HTML element's tag name
     * @param {object} options - Options: classes, text, html, id, attrs, title, elems
     * @param {object} refs - Object which will be modified to store references to created elements. Works when "elems" option is used with "ref" parameter.
     * @returns {HTMLElement}
     */
    function createElement(tagName, options = {}, refs = {}) {
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

    const myElement = createElement("h1", {
        text: "Hello World!",
        classes: ["hello-world"],
    });
    document.body.prepend(myElement);

})();
