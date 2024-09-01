"use strict";

import { createElement } from "../core/functions/node.js";
import { randomBetweenTwoNumbers } from "../core/functions/number.js";
import { enumList } from "../core/functions/enumeration.js";
import { StatusesMixin } from "../core/mixins/statuses.js";
import { DescriptionListPairs } from "../element/description-list-pairs.js";

export const ProgressRunner = (() => {
    const statuses = enumList({
        pending: "Pending",
        running: "Running",
        paused: "Paused",
        completed: "Completed",
    }, "progressRunnerStatuses");
    const privateMethods = {};
    const Mixin = StatusesMixin({ statuses, defaultStatus: statuses.pending, privateMethods });
    return class extends Mixin {
        #changeStatus;
        #value;
        #timesCompleted = 0;
        #animationFrame;
        #session = false;
        constructor(min = 0, max = 100) {
            if (max <= min) {
                throw new DOMException("Maximum value cannot be smaller or equal to minimum value");
            }
            super();
            this.#changeStatus = privateMethods.changeStatus;
            this.min = 0;
            this.max = 100;
            this.#value = this.min;
        }
        get value() {
            return this.#value;
        }
        get timeCompleted() {
            return this.#timesCompleted;
        }
        get isActive() {
            return this.#session !== false;
        }
        get distanceTravelled() {
            return this.#value - this.min;
        }
        get percentageDistance() {
            return (this.#value - this.min) / (this.max - this.min) * 100;
        }
        toElement({ useProgressIndicator = false } = {}) {
            const refs = {};
            const currentPercentageValue = `${Math.floor(this.percentageDistance)}%`;
            const descriptionListPairs = DescriptionListPairs.fromItems([{
                name: "progressValue",
                title: "Progress Value",
                value: currentPercentageValue,
                termClasses: ["progress-value"],
                ref: "progressValue"
            }, {
                name: "value",
                title: "Value",
                value: this.#value,
                termClasses: ["value"],
                ref: "value"
            }, {
                name: "status",
                title: "Status",
                value: this.status.value,
                termClasses: ["status"],
                ref: "progressStatus"
            }], refs);
            let progressBarSchema;
            if (useProgressIndicator) {
                progressBarSchema = {
                    tag: "progress",
                    options: {
                        attrs: {
                            max: 100,
                            value: 0,
                        }
                    },
                };
            } else {
                progressBarSchema = {
                    tag: "div",
                    options: {
                        attrs: {
                            "data-value": this.value,
                        }
                    }
                };
            }
            progressBarSchema.ref = "progressBar";
            if (!useProgressIndicator) {
                progressBarSchema.options.elems = [{
                    node: createElement("span", { text: currentPercentageValue, classes: ["value"] }),
                    ref: "quickProgress"
                }];
            }
            progressBarSchema.options.classes = ["progress-bar"];
            const container = createElement("div", {
                classes: ["progress-message"],
                elems: [progressBarSchema, descriptionListPairs.getElement()]
            }, refs);
            this.addEventListener("valuechange", e => {
                // A value number between min and max values
                const { value } = e.detail;
                const valueFloored = Math.floor(value);
                const pctDistance = this.percentageDistance.toFixed(2);
                const pctDistanceFloored = Math.floor(pctDistance);
                const pctDistanceFlooredStr = `${pctDistanceFloored}%`;
                // Description list values
                refs.progressValue.nextElementSibling.innerText = `${pctDistanceFloored}%`;
                refs.value.nextElementSibling.innerText = valueFloored;
                // CSS variables
                container.style.setProperty("--progress-value", `${pctDistance}%`);
                refs.progressBar.style.setProperty("--progress-value", `${pctDistance}%`);
                // Attributes
                refs.progressBar.dataset.value = pctDistanceFloored;
                if (useProgressIndicator) {
                    refs.progressBar.value = pctDistance;
                }
                refs.quickProgress.innerText = pctDistanceFlooredStr;
            });
            this.addEventListener("statuschange", e => {
                const { newStatus } = e.detail;
                refs.progressStatus.nextElementSibling.innerText = newStatus.value;
                container.dataset.status = newStatus.name;
            });
            return container;
        }
        #setValue(value) {
            value = Math.min(this.max, Math.max(this.min, value));
            if (value !== this.#value) {
                this.#value = value;
                this.dispatchEvent(new CustomEvent("valuechange", {
                    detail: { value }
                }));
            }
        }
        async progressTo(value, duration = 500) {
            if (value === this.#value) {
                return;
            }
            if (this.isActive) {
                if (this.#session.type !== "single") {
                    this.stop();
                } else {
                    cancelAnimationFrame(this.#animationFrame);
                    delete this.#session.startTime;
                    this.#session.initValue = this.#value;
                    this.#session.nextValue = value;
                    this.#session.duration = duration;
                }
            }
            if (!this.#session) {
                // Sets up a new single goal runner config
                const session = {
                    type: "single",
                    initValue: this.#value,
                    // Next value can be higher or lower than the initial value
                    nextValue: value,
                    duration: duration,
                    pauseLength: 0
                };
                const { promise, resolve, reject } = Promise.withResolvers();
                session.promise = promise;
                session.resolution = { resolve, reject };
                this.#session = session;
            }
            this.#changeStatus(statuses.running);
            this.#runSingleGoalFrames();
            return this.#session.promise;
        }
        #runSingleGoalFrames() {
            if (!this.#session || this.#session.type !== "single") {
                console.error("Single goal frames can be run only with active single type session", this.#session);
                return false;
            }
            const frame = timestamp => {
                if (!this.#session.startTime) {
                    this.#session.startTime = timestamp;
                }
                const handle = this.constructor.singleFrameHandler(timestamp, this.#session);
                // Hasn't finished yet
                if (handle !== true) {
                    this.#setValue(handle);
                    this.#animationFrame = requestAnimationFrame(frame);
                // Finished
                } else {
                    // Set the final value
                    this.#setValue(this.#session.nextValue);
                    // Resolve the promise
                    const { resolve } = this.#session.resolution;
                    resolve(this.#session.nextValue);
                    this.stop();
                }
            }
            this.#animationFrame = requestAnimationFrame(frame);
        }
        static singleFrameHandler(timestamp, session) {
            const elapsed = (timestamp - session.startTime - session.pauseLength);
            if (elapsed <= session.duration) {
                const elapsedPercentage = elapsed * 100 / session.duration;
                let result;
                // Growing
                if (session.nextValue > session.initValue) {
                    const goalSize = session.nextValue - session.initValue;
                    result = session.initValue + (elapsedPercentage * goalSize / 100);
                // Shrinking
                } else {
                    const goalSize = session.initValue - session.nextValue;
                    result = session.initValue - (elapsedPercentage * goalSize / 100);
                }
                return result;
            } else {
                return true;
            }
        }
        accumulateValue(add) {
            const value = Math.min(this.max, this.#value + add);
            return this.progressTo(value);
        }
        async progressPlanTo({ plan, timeout = 10_000, duration = 500, maxTimes = 10 } = {}) {
            if (this.isActive) {
                this.stop();
            }
            if (!plan) {
                plan = this.constructor.generateRandomNumbers(randomBetweenTwoNumbers(90, 99), maxTimes);
            }
            this.#setValue(this.min);
            this.#changeStatus(statuses.running);
            if (typeof plan.maxTimes === "number") {
                maxTimes = plan.maxTimes;
            }
            maxTimes = Math.min(maxTimes, Math.floor(timeout / duration));
            const session = {
                type: "plan",
                plan: plan.numbers,
                duration: duration,
                timeout: timeout,
                pauseLength: 0,
                times: maxTimes,
                finalValue: plan.max,
            };
            session.promise = new Promise((resolve, reject) => {
                session.resolution = { resolve, reject };
            });
            this.#session = session;
            this.runProgressPlanFrames();
            return session.promise;
        }
        runProgressPlanFrames() {
            if (!this.#session || this.#session.type !== "plan") {
                console.error("Plan frames can be run only with active plan type session");
            }
            const frame = timestamp => {
                if (!this.#session.startTime) {
                    this.#session.startTime = timestamp;
                }
                let handle = this.constructor.planFrameHandler(timestamp, this.#session);
                if (typeof handle === "number" || handle === null) {
                    if (typeof handle === "number") {
                        this.#setValue(handle);
                    }
                    this.#animationFrame = requestAnimationFrame(frame);
                } else {
                    this.#setValue(this.#session.finalValue);
                    const { resolve } = this.#session.resolution;
                    resolve(this.#session.finalValue);
                    this.stop();
                }
            }
            this.#animationFrame = requestAnimationFrame(frame);
        }
        static planFrameHandler(timestamp, session) {
            const elapsed = (timestamp - session.startTime - session.pauseLength);
            const wait = Math.round((session.timeout - (session.duration * session.times)) / (session.times - 1));
            const cycleTime = (session.duration + wait);
            const gapNumberByElapsed = Math.floor(elapsed / cycleTime);
            const gapCycleEndTime = ((gapNumberByElapsed + 1) * cycleTime);
            const gapCycleActiveEndTime = (gapCycleEndTime - wait);
            const goalSize = session.plan[gapNumberByElapsed];
            if (elapsed <= gapCycleActiveEndTime) {
                const travelledGaps = session.plan.slice(0, gapNumberByElapsed);
                let travelled = 0;
                if (travelledGaps.length) {
                    const reducer = (accumulator, curr) => accumulator + curr;
                    travelled = travelledGaps.reduce(reducer);
                }
                const elapsedPercentage = (!gapNumberByElapsed)
                    ? elapsed * 100 / session.duration
                    : (elapsed - (gapCycleActiveEndTime - session.duration)) * 100 / session.duration;
                return (elapsedPercentage * goalSize / 100) + travelled;
            // Mission complete
            } else if (gapNumberByElapsed == (session.times - 1)) {
                return true;
            // Just wait for the next step
            } else {
                return null;
            }
        }
        stop() {
            if (this.isActive) {
                cancelAnimationFrame(this.#animationFrame);
                this.#session = false;
                this.#changeStatus(statuses.pending);
                return true;
            } else {
                return null;
            }
        }
        async complete(duration = 250) {
            if (this.#value < this.max) {
                const progressTo = await this.progressTo(this.max, duration);
                this.timesCompleted++;
                this.#changeStatus(statuses.completed);
                return progressTo;
            } else {
                return this.max;
            }
        }
        pause() {
            if (this.isRunning) {
                // Halt the frame runner
                cancelAnimationFrame(this.#animationFrame);
                this.#session.pausedAt = performance.now();
                this.#changeStatus(statuses.paused);
                return true;
            } else {
                return null;
            }
        }
        async resume() {
            if (this.isPaused()) {
                const recentPauseLen = (performance.now() - this.#session.pausedAt);
                this.#session.pauseLength = (this.#session.pauseLength + recentPauseLen);
                this.#session.pausedAt = false;
                this.#changeStatus(statuses.running);
                if (this.#session.type == "single") {
                    // Run with the same goals
                    this.#runSingleGoalFrames();
                } else {
                    this.runProgressPlanFrames();
                }
                return this.#session.promise;
            } else {
                return this.#value;
            }
        }
        async revert() {
            const progressTo = await this.progressTo(this.min);
            this.#changeStatus(statuses.pending);
            return progressTo;
        }
        reset() {
            this.stop();
            this.#setValue(this.min);
            this.#changeStatus(statuses.pending);
        }
        static generateRandomNumbers(max, maxTimes) {
            const result = [];
            let currentSum = 0;
            const until = maxTimes - 1;
            for (let i = 0; i < until; i++) {
                // Choose something above 10 for the first number
                const minNum = i === 0 ? 10 : 1;
                // Make sure the first number doesn't overshoot above 50
                const maxNum = i === 0
                    ? 50
                    : max - (maxTimes - i - 1) - currentSum;
                let num = 1;
                if (maxNum > 1) {
                    num = randomBetweenTwoNumbers(minNum, maxNum);
                }
                result[i] = num;
                currentSum += num;
            }
            // Add in the remainder
            result[maxTimes - 1] = max - currentSum;
            return {
                "numbers": result,
                "max": max,
                "maxTimes": maxTimes,
            };
        }
    }
})();