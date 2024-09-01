"use strict";

import { userPaths } from "../../../var/paths.js";

export function dateFormatToParts(date, utc = false) {
    if (!(date instanceof Date)) {
        throw new TypeError("Given date must be an instance of Date");
    }
    const year = (!utc) ? date.getFullYear() : date.getUTCFullYear();
    const month = (!utc) ? date.getMonth() : date.getUTCMonth();
    const day = (!utc) ? date.getDate() : date.getUTCDate();
    const hours = (!utc) ? date.getHours() : date.getUTCHours();
    const minutes = (!utc) ? date.getMinutes() : date.getUTCMinutes();
    const seconds = (!utc) ? date.getSeconds() : date.getUTCSeconds();
    const milliseconds = (!utc) ? date.getMilliseconds() : date.getUTCMilliseconds();
    return {
        year,
        month: String(month + 1).padStart(2, "0"),
        day: String(day).padStart(2, "0"),
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
        milliseconds: String(milliseconds).padStart(3, "0"),
    };
}

export function timestampToLocalISO8601(timestamp) {
    if (typeof timestamp !== "number") {
        throw new TypeError("Value of time must be a number");
    }
    const date = new Date(timestamp);
    const { year, month, day, hours, minutes, seconds } = dateFormatToParts(date);
    // Format the datetime in ISO 8601 format: yyyy-MM-ddTHH:mm:ss
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function dateToNumber(date) {
    const { year, month, day, hours, minutes, seconds, milliseconds } = dateFormatToParts(date);
    return new Number(`${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`);
}

export function dateToNumberUTC(date) {
    const { year, month, day, hours, minutes, seconds, milliseconds } = dateFormatToParts(date, true);
    return new Number(`${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`);
}

export function timeAgo(pastTime, el, locale = document.documentElement.lang) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(`${userPaths.workers}time-ago.js`, { type: "module" });
        worker.postMessage([pastTime]);
        worker.addEventListener("message", e => {
            const [timeNumber, timeUnit] = e.data;
            let time;
            if (timeNumber !== undefined) {
                const relativeTimeFormat = new Intl.RelativeTimeFormat(locale, { style: "short" });
                time = relativeTimeFormat.format(-timeNumber, timeUnit);
            } else {
                time = timeUnit;
            }
            resolve(time);
            if (el) {
                el.textContent = time;
            }
        });
        worker.addEventListener("error", e => {
            reject(e.error);
        });
    });
}