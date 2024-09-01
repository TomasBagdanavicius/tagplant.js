"use strict";

import { createElement } from "../functions/node.js";
import { validateVarInterface } from "../functions/misc.js";
import { MyDate } from "./my-date.js";

export class DateTimeFormat {
    #date;
    #formatOptions;
    #locale;
    #descriptor;
    #formatter;
    #parts;
    #index = {};
    static commonParts = ["year", "month", "day", "hour", "minute", "second"];
    constructor(formatOptions, { date = new MyDate, locale = "en-US" } = {}) {
        validateVarInterface(date, MyDate);
        this.#date = date;
        this.#formatOptions = formatOptions;
        this.#locale = locale;
        this.#descriptor = DateTimeFormat.buildCommonPartDescriptor(formatOptions, locale);
        this.buildParts();
    }
    buildParts(newDate) {
        if (newDate) {
            this.#date = newDate;
        }
        this.#formatter = new Intl.DateTimeFormat(this.#locale, this.#formatOptions);
        this.#parts = this.#formatter.formatToParts(this.#date);
        this.#index = {};
        DateTimeFormat.buildFormatPartsIndex(this.#index, this.#parts);
    }
    get date() {
        return this.#date;
    }
    get formatOptions() {
        return this.#formatOptions;
    }
    get locale() {
        return this.#locale;
    }
    get formatter() {
        return this.#formatter;
    }
    set locale(locale) {
        if (locale !== this.#locale) {
            this.#locale = locale;
            this.buildParts();
        }
    }
    hasPart(name) {
        return Object.hasOwn(this.#index, name);
    }
    hasAnyPart(parts) {
        for (const part of parts) {
            if (this.hasPart(part)) {
                return true;
            }
        }
        return false;
    }
    hasPartsFilter(parts) {
        const result = [];
        for (const part of parts) {
            if (this.hasPart(part)) {
                result.push(part);
            }
        }
        return result;
    }
    changeCommonParts(parts, newDate) {
        const commonPartDependencies = {
            hour: ["dayPeriod"],
            year: ["era", "relatedYear", "yearName"],
            day: ["weekday"]
        }
        let reindex = false;
        const changedParts = {};
        let changedPartsCount = 0;
        for (const [name, value] of Object.entries(parts)) {
            if (DateTimeFormat.commonParts.includes(name) && this.hasPart(name)) {
                changedParts[name] = value;
                changedPartsCount++;
                if (!this.#descriptor[name].isNumeric || Object.hasOwn(commonPartDependencies, name)) {
                    reindex = true;
                    break;
                } else {
                    if (name !== "hour" || !this.hasPart("dayPeriod")) {
                        this.#index[name].value = !this.#descriptor[name].isPadded
                            ? value
                            : MyDate.pad(value);
                    } else {
                        reindex = true;
                        break;
                    }
                }
            }
        }
        if (!newDate) {
            if (changedPartsCount !== 0) {
                this.#date.setParts(changedParts);
            }
        } else {
            this.#date = newDate;
        }
        if (reindex) {
            this.buildParts();
        }
    }
    toString() {
        return this.#parts.reduce((accumulator, { value }) => {
            return accumulator.concat(value);
        }, "");
    }
    toHTML({ splitTimeParts = false } = {}) {
        return this.#parts.reduce((accumulator, { type, value }) => {
            const classes = [type];
            // Regular expression to check if the string contains any Unicode letters
            const regex = /\p{L}/u;
            if (type === "literal" && regex.test(value)) {
                classes.push("word");
            }
            if (splitTimeParts && (type === "hour" || type === "minute" || type === "second")) {
                let glyphsStr = "";
                for (const glyph of value) {
                    glyphsStr = glyphsStr.concat(`<span class="glyph">${glyph}</span>`);
                }
                value = glyphsStr;
            }
            return accumulator.concat(`<span class="${classes.join(" ")}">${value}</span>`);
        }, "");
    }
    toDocumentFragment() {
        const fragment = new DocumentFragment;
        for (const { type, value } of this.#parts) {
            fragment.append(createElement("span", { classes: [type], text: value }));
        }
        return fragment;
    }
    static buildFormatPartsIndex(index, parts) {
        for (const [key, { type }] of Object.entries(parts)) {
            if (type !== "literal") {
                index[type] = parts[key];
            }
        }
    }
    static buildCommonPartDescriptor(formatOptions, locale) {
        const descriptor = {};
        const date = new MyDate(2000, 0, 1, 1, 1, 1);
        const index = {};
        const parts = new Intl.DateTimeFormat(locale, formatOptions).formatToParts(date);
        DateTimeFormat.buildFormatPartsIndex(index, parts);
        for (const part of DateTimeFormat.commonParts) {
            if (Object.hasOwn(index, part)) {
                const value = index[part].value;
                const isNumeric = /^[0-9]+$/.test(value);
                descriptor[part] = {};
                descriptor[part].isNumeric = isNumeric;
                if (isNumeric) {
                    descriptor[part].isPadded = value.startsWith("0");
                }
            }
        }
        return descriptor;
    }
}