"use strict";

/**
 * Enumeration class.
 */
export class Enumeration {}

/**
 * Enumeration member class.
 */
export class EnumerationMember {}

/**
 * Enumeration error class.
 */
export class EnumerationError extends Error {
    constructor(message, options) {
        super(message, options);
    }
}

/**
 * Creates an enumeration list from the given object.
 *
 * @param {Object} object - An object with properties to be converted into enumeration members.
 * @param {string} name - The name of the enumeration.
 * @returns {Proxy} - A proxy that represents the enumeration list.
 *
 * @throws {EnumerationError} If the object contains a reserved property name "_name".
 * @throws {EnumerationError} If trying to access an undefined enumeration property.
 * @throws {EnumerationError} If trying to supplement the enumeration list.
 * @throws {TypeError} If a property value is not a string or a number.
 *
 * @example
 * const colors = enumList({ RED: "red", GREEN: "green", BLUE: "blue" }, "Colors");
 * console.log(colors.RED.value); // "red"
 * console.log(colors._name); // "Colors"
 */
export function enumList(object, name) {
    if (Object.hasOwn(object, "_name")) {
        throw new EnumerationError(`Property "_name" is reserved`);
    }
    const list = Object.create(Enumeration.prototype);
    const proxy = new Proxy(list, {
        get(target, prop) {
            if (prop === "_name") {
                return name;
            }
            if (!(prop in target)) {
                throw new EnumerationError(`Undefined enumeration property "${prop}"`);
            }
            return target[prop];
        },
        set() {
            throw new EnumerationError(`Enumeration list cannot be supplemented`);
        },
        ownKeys(target) {
            return Reflect.ownKeys(target);
        }
    });
    for (const [name, value] of Object.entries(object)) {
        if (typeof value !== "string" && typeof value !== "number") {
            throw new TypeError(`Value of property "${name}" must be either string or number`);
        }
        const element = Object.create(EnumerationMember.prototype);
        element.name = name;
        element.value = value;
        element.listing = proxy;
        Object.freeze(element);
        Object.defineProperty(list, name, {
            value: element,
            enumerable: true
            // All other params default to "false"
        });
    }
    Object.freeze(list);
    return proxy;
}

/**
 * Checks if the given listing has the specified name.
 *
 * @param {Object} listing - The enumeration listing to check.
 * @param {string} name - The name to check against the listing's name.
 * @returns {boolean} - Returns true if the listing's name matches the specified name, otherwise false.
 *
 * @example
 * const colors = enumList({ RED: "red", GREEN: "green", BLUE: "blue" }, "Colors");
 * console.log(isEnumListing(colors, "Colors")); // true
 * console.log(isEnumListing(colors, "NotColors")); // false
 */
export function isEnumListing(listing, name) {
    return listing._name === name;
}

/**
 * Validates if the given listing has the specified name.
 *
 * @param {Object} listing - The enumeration listing to validate.
 * @param {string} name - The expected name of the enumeration listing.
 * @throws {TypeError} If the listing's name does not match the specified name.
 *
 * @example
 * const colors = enumList({ RED: "red", GREEN: "green", BLUE: "blue" }, "Colors");
 * validateEnumName(colors, "Colors"); // No error thrown
 * validateEnumName(colors, "NotColors"); // Throws TypeError
 */
export function validateEnumName(listing, name) {
    if (!isEnumListing(listing, name)) {
        throw new TypeError(`Invalid enumeration: expected "${name}", got ${listing._name}`);
    }
}

/**
 * Validates if the given object is an enumeration listing and optionally checks its name.
 *
 * @param {Object} listing - The object to validate as an enumeration listing.
 * @param {string} [name] - The optional expected name of the enumeration listing.
 * @throws {TypeError} If the listing is not an instance of Enumeration.
 * @throws {TypeError} If the listing's name does not match the specified name.
 *
 * @example
 * const colors = enumList({ RED: "red", GREEN: "green", BLUE: "blue" }, "Colors");
 * validateEnumListing(colors); // No error thrown
 * validateEnumListing(colors, "Colors"); // No error thrown
 * validateEnumListing(colors, "NotColors"); // Throws TypeError
 * validateEnumListing({}, "Colors"); // Throws TypeError
 */
export function validateEnumListing(listing, name) {
    if (!(listing instanceof Enumeration)) {
        throw new TypeError("Argument #1 is not an enumeration listing");
    }
    if (name) {
        validateEnumName(listing, name);
    }
}

/**
 * Validates if the given object is an enumeration member and optionally checks its listing's name.
 *
 * @param {Object} member - The object to validate as an enumeration member.
 * @param {string} [name] - The optional expected name of the enumeration listing.
 * @throws {TypeError} If the member is not an instance of EnumerationMember.
 * @throws {TypeError} If the member's listing's name does not match the specified name.
 *
 * @example
 * const colors = enumList({ RED: "red", GREEN: "green", BLUE: "blue" }, "Colors");
 * const red = colors.RED;
 * validateEnumMember(red); // No error thrown
 * validateEnumMember(red, "Colors"); // No error thrown
 * validateEnumMember(red, "NotColors"); // Throws TypeError
 * validateEnumMember({}, "Colors"); // Throws TypeError
 */
export function validateEnumMember(member, name) {
    if (!(member instanceof EnumerationMember)) {
        throw new TypeError("Argument #1 is not an enumeration member");
    }
    if (name) {
        validateEnumName(member.listing, name);
    }
}

/**
 * Checks if the given enumeration member belongs to a listing with the specified name.
 *
 * @param {Object} member - The enumeration member to check.
 * @param {string} name - The name of the enumeration listing to check against.
 * @returns {boolean} - Returns true if the member belongs to the listing with the specified name, otherwise false.
 * @throws {TypeError} If the member is not an instance of EnumerationMember.
 *
 * @example
 * const colors = enumList({ RED: "red", GREEN: "green", BLUE: "blue" }, "Colors");
 * const red = colors.RED;
 * console.log(enumMemberBelongsTo(red, "Colors")); // true
 * console.log(enumMemberBelongsTo(red, "NotColors")); // false
 * console.log(enumMemberBelongsTo({}, "Colors")); // Throws TypeError
 */
export function enumMemberBelongsTo(member, name) {
    if (!(member instanceof EnumerationMember)) {
        throw new TypeError("Argument #1 is not an enumeration member");
    }
    return isEnumListing(member.listing, name);
}

/**
 * Finds an enumeration member by its name within a given listing.
 *
 * @param {Object} listing - The enumeration listing to search within.
 * @param {string} searchName - The name of the enumeration member to find.
 * @returns {EnumerationMember|null} - Returns the found enumeration member, or null if no member with the given name is found.
 *
 * @example
 * const colors = enumList({ RED: "red", GREEN: "green", BLUE: "blue" }, "Colors");
 * const red = findEnumMemberByName(colors, "RED");
 * console.log(red.value); // "red"
 * const yellow = findEnumMemberByName(colors, "YELLOW");
 * console.log(yellow); // null
 */
export function findEnumMemberByName(listing, searchName) {
    for (const member of Object.values(listing)) {
        if (member.name === searchName) {
            return member;
        }
    }
    return null;
}

/**
 * Finds an enumeration member by its value within a given listing.
 *
 * @param {Object} listing - The enumeration listing to search within.
 * @param {string|number} searchValue - The value of the enumeration member to find.
 * @returns {EnumerationMember|null} - Returns the found enumeration member, or null if no member with the given value is found.
 *
 * @example
 * const colors = enumList({ RED: "red", GREEN: "green", BLUE: "blue" }, "Colors");
 * const red = findEnumMemberByValue(colors, "red");
 * console.log(red.name); // "RED"
 * const yellow = findEnumMemberByValue(colors, "yellow");
 * console.log(yellow); // null
 */
export function findEnumMemberByValue(listing, searchValue) {
    for (const member of Object.values(listing)) {
        if (member.value === searchValue) {
            return member;
        }
    }
    return null;
}

/**
 * Enumerates heading levels with specific HTML tags.
 *
 * @type {Proxy}
 */
export const headingLevels = enumList({
    one: "h1",
    two: "h2",
    three: "h3",
    four: "h4",
    five: "h5",
    six: "h6"
}, "headingLevels");

/**
 * Enumerates DOM adjacency positions.
 *
 * @type {Proxy}
 */
export const adjacencyPositions = enumList({
    beforebegin: "beforebegin",
    afterbegin: "afterbegin",
    beforeend: "beforeend",
    afterend: "afterend"
}, "adjacencyPositions");

/**
 * Enumerates HTTP methods.
 *
 * @type {Proxy}
 */
export const httpMethods = enumList({
    head: "HEAD",
    get: "GET",
    post: "POST",
    put: "PUT",
    delete: "DELETE",
    trace: "TRACE",
    patch: "PATCH",
    options: "OPTIONS",
    connect: "CONNECT",
}, "httpMethods");

/**
 * Enumerates Promise states.
 *
 * @type {Proxy}
 */
export const promiseStates = enumList({
    pending: "pending",
    fulfilled: "fulfilled",
    rejected: "rejected"
}, "promiseStates");

/**
 * Enumerates DOM manipulation actions.
 *
 * @type {Proxy}
 */
export const DOMManipulationActions = enumList({
    append: "append",
    prepend: "prepend",
}, "DOMManipulationActions");

/**
 * Enumerates positional corners.
 *
 * @type {Proxy}
 */
export const positionalCorners = enumList({
    topleft: "topleft",
    topright: "topright",
    bottomleft: "bottomleft",
    bottomright: "bottomright",
}, "positionalCorners");

/**
 * Enumerates statuses.
 *
 * @type {Proxy}
 */
export const statuses = enumList({
    success: "success",
    error: "error",
}, "statuses");

/**
 * Enumerates sort directions.
 *
 * @type {Proxy}
 */
export const sortDirection = enumList({
    asc: "ASC",
    desc: "DESC"
}, "sortDirection");

/**
 * Enumerates positioning options.
 *
 * @type {Proxy}
 */
export const positioning = enumList({
    top: "top",
    right: "right",
    bottom: "bottom",
    left: "left",
    center: "center"
}, "positioning");

/**
 * Enumerates history actions.
 *
 * @type {Proxy}
 */
export const historyAction = enumList({
    push: "push",
    replace: "replace"
}, "historyAction");

/**
 * Enumerates enabled and disabled states.
 *
 * @type {Proxy}
 */
export const enabledDisabled = enumList({
    enabled: "enabled",
    disabled: "disabled",
}, "enabledDisabled");