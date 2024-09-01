"use strict";

import { isNullish, validateVarInterface, promiseSeries, valueSearch, searchable, fillInSearachableElementValue } from "../core/functions/misc.js";
import { arrayGetLastElement } from "../core/functions/array.js";
import { isNonNullObject } from "../core/functions/object.js";
import { EnumerationMember, enumList } from "../core/functions/enumeration.js";
import { DOMExceptionWithCause, PromiseSeriesAbortException } from "../core/exceptions.js";
import { CancelablePromise } from "../core/process/cancelable-promise.js";
import { StatusesMixin } from "../core/mixins/statuses.js";
import { Article } from "../element/article.js";
import { Menu } from "../element/menu.js";
import { DescriptionListPairs } from "../element/description-list-pairs.js";
import { List } from "../element/list.js";
import { StoreListing } from "../element/listing/store-listing.js";
import { MapStoreManager } from "../core/store/map-store-manager.js";
import { createElement, detachElement, isElementAttached } from "../core/functions/node.js";

export const Job = (() => {
    let id = 0;
    const statuses = enumList({
        pending: "Pending",
        waiting: "Waiting",
        doing: "Doing",
        done: "Done",
        cancelling: "Cancelling",
        cancelled: "Cancelled",
        failed: "Failed",
    }, "jobStatuses");
    const outcomes = enumList({
        done: "done",
        cancelled: "cancelled",
        failed: "failed",
    }, "jobOutcomes");
    const privateMethods = {};
    const Mixin = StatusesMixin({ statuses, defaultStatus: statuses.pending, privateMethods });
    return class extends Mixin {
        #id;
        #changeStatus;
        #name;
        #category;
        #host;
        #outcome;
        #isSettled = false;
        #jobs;
        #tasks;
        #dependencies = new Set;
        #abortController;
        #revertPromise;
        #result;
        #goals;
        constructor(name, tasks, { jobs, category = "main", host, goals } = {}) {
            validateVarInterface(jobs, Jobs, { paramNumber: 3, allowUndefined: true });
            super();
            id++;
            this.#changeStatus = privateMethods.changeStatus;
            this.#id = id;
            this.#name = name;
            this.#category = category;
            this.#host = host;
            this.#jobs = jobs;
            this.#tasks = tasks;
            this.#goals = goals;
            if (jobs) {
                const filteredSet = jobs.filter([category], null, false, host, goals);
                if (filteredSet.size !== 0) {
                    const identicalJob = filteredSet.values().next().value;
                    this.addDependency(identicalJob);
                    identicalJob.settled().then(() => {
                        this.#settle(identicalJob.outcome, identicalJob.result);
                    });
                }
                jobs.add(this);
            }
        }
        get id() {
            return this.#id;
        }
        get keyPath() {
            return "id";
        }
        get name() {
            return this.#name;
        }
        get category() {
            return this.#category;
        }
        get host() {
            return this.#host;
        }
        get isSettled() {
            return this.#isSettled;
        }
        get result() {
            return this.#result;
        }
        get outcome() {
            return this.#outcome;
        }
        get goals() {
            return this.#goals;
        }
        static get statuses() {
            return statuses;
        }
        static get outcomes() {
            return outcomes;
        }
        #buildMenu() {
            const menu = new Menu;
            let doButton;
            let doKey;
            let cancelButton;
            let cancelKey;
            if (this.isPending) {
                ([, doKey, doButton] = menu.appendButton("Do", "do"));
                doButton.addEventListener("click", async () => {
                    try {
                        await this.do();
                    // eslint-disable-next-line no-unused-vars
                    } catch (error) {
                        // Reduce console noise
                    }
                });
            }
            if (!this.isDone) {
                ([, cancelKey, cancelButton] = menu.appendButton("Cancel", "cancel"));
                cancelButton.addEventListener("click", async () => {
                    try {
                        await this.cancel();
                    // eslint-disable-next-line no-unused-vars
                    } catch (error) {
                        // Reduce console noise
                    }
                });
                if (this.isCancelling) {
                    cancelButton.disabled = true;
                }
                this.addEventListener("settle", () => {
                    menu.remove(cancelKey);
                });
            }
            if (doKey || cancelKey) {
                this.addEventListener("statuschange", () => {
                    menu.remove(doKey);
                    if (this.isCancelling) {
                        cancelButton.disabled = true;
                    }
                });
            }
            return menu;
        }
        #buildDepedencyList() {
            const dependencyList = new List({ classes: ["dependencies"] });
            const addDependencyToList = job => {
                const key = `job${job.id}`;
                const textNode = document.createTextNode(job.name);
                const [listItem] = dependencyList.append(textNode, key);
                return listItem;
            }
            for (const dependency of this.#dependencies) {
                addDependencyToList(dependency);
            }
            this.addEventListener("dependency", e => {
                const { job } = e.detail;
                const listItem = addDependencyToList(job);
                job.addStatusAttrTo(listItem);
            });
            this.addEventListener("dependencyremove", e => {
                const { job } = e.detail;
                const key = `job${job.id}`;
                dependencyList.remove(key);
            });
            return dependencyList;
        }
        addDependency(job) {
            validateVarInterface(job, Job);
            if (!this.isPending && !this.isWaiting) {
                throw new DOMException("Dependency can be added only when job is pending or waiting", "StatusError");
            }
            if (this.#jobs && !this.#jobs.has(job)) {
                throw new DOMException("Job must belong to parent listing", "HierarchyError");
            }
            this.#dependencies.add(job);
            this.dispatchEvent(new CustomEvent("dependency", { detail: { job } }));
            job.addEventListener("settle", () => {
                this.#dependencies.delete(job);
            });
        }
        removeDependency(job) {
            validateVarInterface(job, Job);
            const result = this.#dependencies.delete(job);
            if (result) {
                this.dispatchEvent(new CustomEvent("dependencyremove", { detail: { job } }));
            }
            return result;
        }
        hasDependencies() {
            return this.#dependencies.size !== 0;
        }
        dependencies() {
            if (!this.hasDependencies()) {
                return CancelablePromise.resolve();
            }
            return new CancelablePromise((resolve, reject) => {
                const values = [];
                const settleCheck = job => {
                    if (job.isFailed) {
                        reject(`Job "${job.name}" has failed`);
                    } else if (job.isCancelled) {
                        reject(`Job "${job.name}" has been cancelled`);
                    } else {
                        values.push(...job.result);
                        if (!this.hasDependencies()) {
                            resolve(values);
                        }
                    }
                }
                const cancellingCheck = job => {
                    if (job.isCancelling) {
                        reject(`Job "${job.name}" is being cancelled`);
                    }
                }
                for (const job of this.#dependencies) {
                    if (job.isSettled) {
                        settleCheck(job);
                    } else {
                        cancellingCheck(job);
                    }
                    job.addEventListener("statuschange", () => {
                        cancellingCheck(job);
                    });
                    job.addEventListener("settle", () => {
                        settleCheck(job);
                    });
                }
            });
        }
        async do({ abortController = new AbortController, returnLastValue = false } = {}) {
            if (!this.isPending) {
                throw new DOMException("Only pending jobs can be done", "StatusError");
            }
            let initialValues = [];
            if (this.hasDependencies()) {
                this.#changeStatus(statuses.waiting);
                const dependencies = this.dependencies();
                this.addEventListener("statuschange", e => {
                    if (e.detail.newStatus === statuses.cancelled) {
                        dependencies.cancel();
                    }
                });
                abortController.signal.addEventListener("abort", e => {
                    this.cancel(e.target.reason);
                });
                try {
                    initialValues = await dependencies;
                } catch (error) {
                    if (!CancelablePromise.isPromiseAbortException(error)) {
                        const dependencyError = new DOMExceptionWithCause("Dependency error", "DependencyError", error);
                        this.#settle(outcomes.fail, dependencyError);
                        throw dependencyError;
                    }
                    throw error;
                }
            }
            this.#abortController = abortController;
            this.#changeStatus(statuses.doing);
            try {
                const values = await promiseSeries(this.#tasks, {
                    signal: abortController.signal,
                    initialValues,
                    onEnd: ({ revertPromise }) => {
                        this.#revertPromise = revertPromise;
                    }
                });
                this.#settle(outcomes.done, values);
                if (!returnLastValue) {
                    return values;
                } else {
                    return arrayGetLastElement(values);
                }
            } catch (error) {
                if (error instanceof PromiseSeriesAbortException) {
                    this.#changeStatus(statuses.cancelling);
                    try {
                        await this.#revertPromise;
                    } catch (error) {
                        this.#settle(outcomes.failed, error);
                        throw error;
                    }
                    this.#settle(outcomes.cancelled, error);
                } else {
                    this.#settle(outcomes.failed, error);
                }
                throw error;
            }
        }
        async done() {
            return new Promise(resolve => {
                if (this.isDone) {
                    resolve();
                } else {
                    this.addEventListener("statuschange", e => {
                        if (e.detail.newStatus === statuses.done) {
                            resolve();
                        }
                    });
                }
            });
        }
        #settle(outcome, result) {
            this.#outcome = outcome;
            this.#isSettled = true;
            this.#result = result;
            switch (outcome) {
                case outcomes.done:
                    this.#changeStatus(statuses.done);
                    break;
                case outcomes.failed:
                    this.#changeStatus(statuses.failed);
                    break;
                case outcomes.cancelled:
                    result = new DOMExceptionWithCause("Cancel error", "AbortError", result);
                    this.#result = result;
                    this.#changeStatus(statuses.cancelled);
                    break;
            }
            this.dispatchEvent(new CustomEvent("settle", {
                detail: { status: this.status, outcome, result }
            }));
            return result;
        }
        async settled() {
            return new Promise((resolve, reject) => {
                const outcomeCheck = () => {
                    if (this.#outcome === outcomes.done) {
                        resolve(this.#result);
                    } else {
                        reject(this.#result);
                    }
                }
                if (!this.isSettled) {
                    this.addEventListener("settle", () => {
                        outcomeCheck();
                    });
                } else {
                    outcomeCheck();
                }
            });
        }
        async cancel(reason) {
            if (this.isCancelled) {
                return this.#result.cause;
            }
            if (this.isDone || this.isFailed) {
                throw new DOMException("Done or failed jobs cannot be cancelled", "StateError");
            }
            if (this.isPending || this.isWaiting) {
                return this.#settle(outcomes.cancelled, reason);
            }
            if (this.isDoing || this.isCancelling) {
                if (this.isDoing) {
                    this.#abortController.abort(reason);
                }
                await this.#revertPromise;
            }
            try {
                await this.settled();
            } catch (error) {
                return error.cause;
            }
        }
        toElementRepresentative({ search } = {}) {
            const article = new Article(this.#name, { classes: ["job"] });
            searchable(this.#name, search, article.heading);
            const descriptionList = new DescriptionListPairs;
            const [, details] = descriptionList.appendPair("Status", this.status.value);
            searchable(this.status.value, search, details);
            this.addEventListener("statuschange", e => {
                const newStatusValue = e.detail.newStatus.value;
                details.textContent = newStatusValue;
                searchable(newStatusValue, search, details);
                if (this.isFailed) {
                    let text = this.#result.message || this.#result;
                    if (this.#result.cause) {
                        text = text.concat(": ", this.#result.cause.message || this.#result.cause);
                    }
                    descriptionList.appendPair("Failure reason", text);
                }
            });
            article.insert(descriptionList.element);
            const menu = this.#buildMenu();
            article.insert(menu);
            const dependencyList = this.#buildDepedencyList();
            let dependencyHeading = createElement("h6", { text: "Dependencies" })
            if (dependencyList.count !== 0) {
                article.insert(dependencyHeading);
            }
            dependencyList.addEventListener("countchange", e => {
                const { newCount } = e.detail;
                if (newCount && !isElementAttached(dependencyHeading)) {
                    dependencyList.element.before(dependencyHeading);
                } else if (!newCount && isElementAttached(dependencyHeading)) {
                    detachElement(dependencyHeading);
                }
            });
            article.insert(dependencyList);
            return article;
        }
        toElement({ search } = {}) {
            return this.toElementRepresentative({ search }).element;
        }
        toGroupMember({ search } = {}) {
            return this.toElement({ search });
        }
        toElementChunks({ search, chunkList } = {}) {
            const chunkElems = {
                id: elem => {
                    const text = "#".concat(this.id);
                    fillInSearachableElementValue(elem, text, search);
                },
                name: elem => {
                    fillInSearachableElementValue(elem, this.#name, search);
                },
                status: elem => {
                    this.addStatusAttrTo(elem);
                    this.updateStatusText(elem, search);
                },
                dependencies: elem => {
                    const dependencyList = this.#buildDepedencyList();
                    elem.append(dependencyList.element);
                }
            };
            if (isNonNullObject(chunkList)) {
                const result = {};
                for (const chunkName of Object.keys(chunkList)) {
                    if (Object.hasOwn(chunkElems, chunkName)) {
                        result[chunkName] = chunkElems[chunkName];
                    }
                }
                return result;
            } else {
                return chunkElems;
            }
        }
        toItem() {
            return {
                id: this.id,
                name: this.name,
                status: this.status.value,
            };
        }
        static compareGoals(goals1, goals2) {
            const keys1 = Object.keys(goals1);
            const keys2 = Object.keys(goals2);
            if (keys1.length !== keys2.length) {
                return false;
            }
            for (const key of keys1) {
                if (goals1[key] !== goals2[key]) {
                    return false;
                }
            }
            return true;
        }
        static get chunkNames() {
            return {
                id: "ID",
                name: "Name",
                status: "Status",
                dependencies: "Dependencies",
            };
        }
        static get criteriaItems() {
            return ["id", "name", "status"];
        }
        static get sortValues() {
            return {
                id: "ID",
                name: "Name",
                status: "Status"
            };
        }
        trackCriteria(criteria) {
            const controller = Object.create(null);
            let search;
            if (Object.hasOwn(criteria, "search")) {
                search = criteria.search;
                delete criteria.search;
            }
            let match = false;
            const matches = {};
            const update = () => {
                const values = Object.values(matches);
                const containsMatch = values.includes(true);
                if (containsMatch !== match) {
                    match = containsMatch;
                    if (typeof controller.onchange === "function") {
                        controller.onchange(match);
                    }
                }
            }
            const check = (name, value) => {
                let match = false;
                if (name in criteria && criteria[name] == value) {
                    match = true;
                } else if (search) {
                    let searchValue = value;
                    if (value instanceof EnumerationMember) {
                        searchValue = value.value;
                    }
                    if (valueSearch(searchValue, search, true, true)) {
                        match = true;
                    }
                }
                matches[name] = match;
            }
            for (const item of this.constructor.criteriaItems) {
                if (search || item in criteria) {
                    check(item, this[item]);
                }
                if (item === "status") {
                    this.addEventListener("statuschange", e => {
                        check("status", e.detail.newStatus);
                        update();
                    });
                }
            }
            update();
            Object.assign(controller, {
                get isMatch() {
                    return match;
                },
                get matches() {
                    return matches;
                }
            });
            return controller;
        }
    }
})();

export class Jobs {
    #store = new MapStoreManager;
    get collection() {
        return this.#store.store;
    }
    get count() {
        return this.#store.size;
    }
    create(name, tasks, { category = "main", host }) {
        return new Job(name, tasks, { jobs: this, category, host });
    }
    add(job) {
        validateVarInterface(job, Job);
        if (!this.has(job)) {
            this.#store.add(job, job.id);
        }
    }
    has(job) {
        validateVarInterface(job, Job);
        return this.#store.hasKey(job.id);
    }
    filter(categories, names, settled, host, goals) {
        const filteredCollection = new Set;
        if (!isNullish(categories) && !Array.isArray(categories)) {
            categories = [categories];
        }
        if (!isNullish(names) && !Array.isArray(names)) {
            names = [names];
        }
        for (const [, job] of this.#store) {
            if (host && host !== job.host) {
                continue;
            }
            if (categories && categories.length && !categories.includes(job.category)) {
                continue;
            }
            if (names && names.length && !names.includes(job.name)) {
                continue;
            }
            if ((settled === true && !job.isSettled) || (settled === false && job.isSettled)) {
                continue;
            }
            if (goals && ((job.goals && !Job.compareGoals(goals, job.goals)) || !job.goals)) {
                continue;
            }
            filteredCollection.add(job);
        }
        return filteredCollection;
    }
    static async waitFor(jobs) {
        if (!jobs.size) {
            return Promise.resolve();
        }
        const promises = [];
        for (const job of jobs) {
            promises.push(job.settled());
        }
        return await Promise.all(promises);
    }
    static async cancel(jobs) {
        if (!jobs.size) {
            return Promise.resolve();
        }
        const promises = [];
        for (const job of jobs) {
            promises.push(job.cancel());
        }
        return await Promise.all(promises);
    }
    toItems() {
        const items = [];
        for (const [, job] of this.#store) {
            items.push(job.toItem());
        }
        return items;
    }
    toElementRepresentative({ format = "default" } = {}) {
        const options = {
            searchable: true,
            keyAsDataId: true,
            format,
            chunkNames: Job.chunkNames,
            sortValues: Job.sortValues,
        };
        if (format === "chunks") {
            options.includeHead = true;
        }
        return new StoreListing(this.#store, "Jobs", options);
    }
    toElement({ format = "default" } = {}) {
        return this.toElementRepresentative({ format }).element;
    }
}

export const onConcurrentAction = (() => {
    const actions = {};
    return async (category, newGoals, currentGoals, callback, {
        force = true,
        signal,
        finallyCallback,
        payload
    } = {}) => {
        if (category in actions) {
            const data = actions[category];
            if (data.isActive) {
                if (Job.compareGoals(data.goals, newGoals)) {
                    for (const name of Object.keys(data.payload)) {
                        payload[name] = data.payload[name];
                    }
                    return await data.promise;
                } else {
                    data.abortController.abort();
                }
            }
            if (!force && Job.compareGoals(newGoals, currentGoals)) {
                return currentGoals;
            }
        }
        const { promise, resolve, reject } = Promise.withResolvers();
        if (category in actions === false) {
            actions[category] = { id: 1 };
        } else {
            actions[category].id++;
        }
        actions[category].isActive = true;
        actions[category].goals = newGoals;
        actions[category].promise = promise;
        actions[category].abortController = new AbortController;
        actions[category].payload = payload;
        const actionId = actions[category].id;
        try {
            const signals = [actions[category].abortController.signal];
            if (signal && signal instanceof AbortSignal) {
                signals.push(signal);
            }
            const combinedSignal = AbortSignal.any(signals);
            await callback(combinedSignal);
            resolve(newGoals);
        } catch (error) {
            reject(error);
            // Reduce console noise: when succeeding calls do not await this promise and it rejects, capture it
            // eslint-disable-next-line no-useless-catch
            try {
                await promise;
            } catch (error) {
                throw error;
            }
        } finally {
            if (finallyCallback) {
                finallyCallback();
            }
            if (actionId === actions[category].id) {
                actions[category].isActive = false;
            }
        }
        return newGoals;
    }
})();

export const globalJobs = new Jobs;