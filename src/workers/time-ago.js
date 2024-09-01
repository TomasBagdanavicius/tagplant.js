"use strict";

import { trimStartChars } from "../core/functions/string.js";
import { numberRange } from "../core/functions/number.js";
import { dateFormatToParts, dateToNumberUTC } from "../core/functions/date.js";
import { MyDate } from "../core/date-time/my-date.js";
import { workerInfo, workerScopeOnMessage, workerScopePostMessage } from "./utils.js";

function work() {
    workerScopeOnMessage(data => {
        let [pastTime, customCurrentTime, updateIncrement] = data;
        if (updateIncrement === undefined || updateIncrement === null) {
            updateIncrement = true;
        } else {
            updateIncrement = !!updateIncrement;
        }
        if (!(pastTime instanceof Date)) {
            workerScopePostMessage(new TypeError("Value of time must be an instance of Date"));
            return false;
        }
        const currentTime = customCurrentTime ?? new Date();
        const diff = (currentTime - pastTime) / 1000;
        if (diff < 0) {
            workerScopePostMessage(new RangeError("Given time must not be bigger than the current time"));
            return false;
        }
        let timeNumber;
        let timeUnit;
        // 1-5 seconds
        if (diff <= 5) {
            timeNumber = undefined;
            timeUnit = "just now";
        // Less than a minute
        } else if (diff < 60) {
            timeNumber = Math.floor(diff);
            timeUnit = "seconds";
        // Less than an hour
        } else if (diff < 60 * 60) {
            timeNumber = Math.floor(diff / 60);
            timeUnit = "minutes";
        // Less than a day
        } else if (diff < 60 * 60 * 24) {
            timeNumber = Math.floor(diff / (60 * 60));
            timeUnit = "hours";
        // Less than a week
        } else if (diff < (60 * 60 * 24 * 7)) {
            timeNumber = Math.floor(diff / (60 * 60 * 24));
            timeUnit = "days";
        } else {
            const pastTimeYear = pastTime.getUTCFullYear();
            const currentTimeYear = currentTime.getUTCFullYear();
            const yearDiff = (currentTimeYear - pastTimeYear);
            const toMonthNumber = function(time) {
                return new Number(trimStartChars(new String(dateToNumberUTC(time)).substring(4), "0"));
            }
            if (yearDiff > 0) {
                const pastTimeMonthNumber = toMonthNumber(pastTime);
                const currentTimeMonthNumber = toMonthNumber(currentTime);
                // Year(s) ago
                if (yearDiff > 1 || pastTimeMonthNumber <= currentTimeMonthNumber) {
                    let yearsAgo;
                    if (yearDiff === 1) {
                        yearsAgo = 1;
                    } else {
                        yearsAgo = (pastTimeMonthNumber <= currentTimeMonthNumber) ? yearDiff : yearDiff - 1;
                    }
                    timeNumber = yearsAgo;
                    timeUnit = "years";
                }
            }
            const pastTimeMonth = pastTime.getUTCMonth();
            const currentTimeMonth = currentTime.getUTCMonth();
            const monthDiff = (yearDiff) ? 12 - pastTimeMonth + currentTimeMonth : (currentTimeMonth - pastTimeMonth);
            const toDayNumber = function(time) {
                const { day, hours, minutes, seconds, milliseconds } = dateFormatToParts(time);
                return new Number(`${day}${hours}${minutes}${seconds}${milliseconds}`);
            }
            const pastTimeDayNumber = toDayNumber(pastTime);
            const currentTimeDayNumber = toDayNumber(currentTime);
            // Week(s) ago
            if (
                // Same year, same month
                (!yearDiff && pastTimeMonth === currentTimeMonth)
                || (monthDiff <= 1 && pastTimeDayNumber > currentTimeDayNumber)
            ) {
                timeNumber = Math.floor(diff / (60 * 60 * 24 * 7));
                timeUnit = "weeks";
            }
            let monthsAgo;
            if (monthDiff === 1) {
                monthsAgo = 1;
            } else {
                monthsAgo = (pastTimeDayNumber <= currentTimeDayNumber) ? monthDiff : monthDiff - 1;
            }
            timeNumber = monthsAgo;
            timeUnit = "months";
        }
        workerScopePostMessage([timeNumber, timeUnit]);
        if (updateIncrement) {
            const increments = {
                seconds: [5,30],
                minutes: [1,2,5,10,30],
                hours: [1,3,5,10,16,24],
            };
            if ("seconds" in increments) {
                increments.seconds = increments.seconds.filter(val => val < 60);
            } else {
                increments.seconds = [1, 30];
            }
            if ("minutes" in increments) {
                increments.minutes = increments.minutes.filter(val => val < 60);
            } else {
                increments.minutes = numberRange(1, 59);
            }
            if ("hours" in increments) {
                increments.hours = increments.hours.filter(val => val < 24);
            } else {
                increments.hours = numberRange(1, 23);
            }
            function* customIterator(obj, currentPart, currentValue) {
                const smallerParts = currentPart ? MyDate.getSmallerPartsThan(currentPart) : [];
                for (const [key, increments] of Object.entries(obj)) {
                    if (!smallerParts.includes(key)) {
                        for (const increment of increments) {
                            if (!currentValue || (key !== currentPart || increment > currentValue)) {
                                yield [key, increment];
                            }
                        }
                    }
                }
            }
            const iterator = customIterator(increments, timeUnit === "just now" ? undefined : timeUnit, timeNumber);
            function tick() {
                const next = iterator.next();
                if (next.done) {
                    return false;
                }
                const futureDate = new MyDate(pastTime);
                const [partName, partValue] = next.value;
                const parts = {};
                parts[partName] = partValue;
                futureDate.addParts(parts);
                const waitTime = futureDate - new Date;
                setTimeout(() => {
                    workerScopePostMessage([partValue, partName]);
                    tick();
                }, waitTime);
            }
            tick();
        }
    });
}

if (typeof self === "object") {
    work();
} else if (typeof global === "object") {
    import("worker_threads").then(module => {
        const { parentPort } = module;
        workerInfo.parentPort = parentPort;
        work();
    }).catch(error => {
        console.error(error);
    });
}