"use strict";

import { stringCapitalizeFirstLetter } from "../functions/string.js";

export class MyDate extends Date {
    static partNames = [
        "years",
        "months",
        "days",
        "hours",
        "minutes",
        "seconds",
        "milliseconds"
    ];
    static callNamesMap = {
        year: "FullYear",
        day: "Date",
        month: "Month",
        hour: "Hours",
        minute: "Minutes",
        second: "Seconds",
        millisecond: "Milliseconds",
    };
    clone() {
        return new MyDate(this);
    }
    addMilliseconds(milliseconds) {
        this.setMilliseconds(this.getMilliseconds() + milliseconds * 1);
        return this;
    }
    addSeconds(seconds) {
        this.addMilliseconds(seconds * 1000);
        return this;
    }
    addMinutes(minutes) {
        this.addMilliseconds(minutes * 60000);
        return this;
    }
    addHours(hours) {
        this.addMilliseconds(hours * 3600000);
        return this;
    }
    addDays(days) {
        this.setDate(this.getDate() + days * 1);
        return this;
    }
    addWeeks(weeks) {
        this.addDays(weeks * 7);
        return this;
    }
    addMonths(months) {
        const day = this.getDate();
        this.setDate(1);
        this.setMonth(this.getMonth() + months);
        this.setDate(Math.min(day, MyDate.getDaysInMonth(this.getFullYear(), this.getMonth())));
        return this;
    }
    addYears(years) {
        this.addMonths(years * 12);
        return this;
    }
    addParts(parts) {
        for (const [name, value] of Object.entries(parts)) {
            if (MyDate.partNames.includes(name)) {
                const methodName = `add${stringCapitalizeFirstLetter(name)}`;
                this[methodName](value);
            }
        }
        return this;
    }
    setParts(parts, utc = false) {
        for (const [name, value] of Object.entries(parts)) {
            if (name in MyDate.callNamesMap) {
                let methodName = "set";
                if (utc) {
                    methodName += "UTC";
                }
                methodName += MyDate.callNamesMap[name];
                this[methodName](value);
            }
        }
    }
    getNextTopOfSecond() {
        const next = this.clone();
        const currentSeconds = next.getSeconds();
        if (currentSeconds === 59) {
            return this.getNextTopOfMinute();
        }
        next.setSeconds(currentSeconds + 1, 0);
        return next;
    }
    getNextTopOfMinute() {
        const next = this.clone();
        const currentMinutes = next.getMinutes();
        if (currentMinutes === 59) {
            return this.getNextTopOfHour();
        }
        next.setMinutes(currentMinutes + 1, 0, 0);
        return next;
    }
    getNextTopOfHour() {
        const next = this.clone();
        const currentHours = next.getHours();
        if (currentHours === 23) {
            return this.getNextTopOfDay();
        }
        next.setHours(currentHours + 1, 0, 0, 0);
        return next;
    }
    getNextYear() {
        return this.getFullYear() + 1;
    }
    getTopOfYear() {
        return new Date(this.getNextYear(), 0, 1, 0, 0, 0, 0);
    }
    toParts({ parts, padded = false, utc = false } = {}) {
        if (!parts) {
            parts = Object.keys(MyDate.callNamesMap);
        }
        const result = {};
        for (const name of parts) {
            if (name in MyDate.callNamesMap) {
                let methodName = "get";
                if (utc) {
                    methodName += "UTC";
                }
                methodName += MyDate.callNamesMap[name];
                let partValue = this[methodName]();
                if (padded && name !== "year") {
                    let padLen = 2;
                    if (name === "millisecond") {
                        padLen = 3;
                    }
                    partValue = MyDate.pad(partValue, padLen);
                }
                result[name] = partValue;
            }
        }
        return result;
    }
    toLocalISOString({ includeMilliseconds = false, includeOffset = false } = {}) {
        const partsToFetch = ["year", "month", "day", "hour", "minute", "second"];
        if (includeMilliseconds) {
            partsToFetch.push("millisecond");
        }
        const parts = this.toParts({ parts: partsToFetch, padded: true });
        const { year, month, day, hour, minute, second } = parts;
        let result = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        if (includeMilliseconds) {
            result += `.${parts.millisecond}`;
        }
        if (includeOffset) {
            result += MyDate.formatTimezoneOffset(this.getTimezoneOffset());
        }
        return result;
    }
    static pad(value, length = 2) {
        return String(value).padStart(length, "0");
    }
    static isLeapYear(year) {
        return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
    }
    static getDaysInMonth(year, month) {
        return [31, (MyDate.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
    }
    static formatTimezoneOffset(offsetMinutes) {
        const sign = offsetMinutes >= 0 ? "-" : "+";
        const hours = Math.floor(Math.abs(offsetMinutes) / 60);
        const minutes = Math.abs(offsetMinutes) % 60;
        return `${sign}${MyDate.pad(hours)}${MyDate.pad(minutes)}`;
    }
    static getSmallerPartsThan(part) {
        if (!MyDate.partNames.includes(part)) {
            throw new DOMException(`Part ${part} is invalid`);
        }
        const result = [];
        let found = false;
        for (const partName of MyDate.partNames) {
            if (found) {
                result.push(partName);
            } else if (partName === part) {
                found = true;
            }
        }
        return result;
    }
    static compareParts(parts1, parts2, ignore = []) {
        const changed = [];
        for (const [name, value] of Object.entries(parts1)) {
            if (!ignore.includes(name) && value !== parts2[name]) {
                changed.push(name);
            }
        }
        return changed;
    }
    static convertTo12HourFormat(hour24) {
        return hour24 <= 12 ? hour24 : hour24 - 12;
    }
    static getDayPeriodNumberFromHour24(hour24) {
        return hour24 <= 11 ? 1 : 2;
    }
    static getDayPeriodNumberFromAMPM(indicator) {
        indicator = indicator.toLowerCase();
        return indicator === "am" ? 1 : 2;
    }
}