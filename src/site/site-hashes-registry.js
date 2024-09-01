"use strict";

export const siteHashesRegistry = (() => {
    const hashes = new Map;
    const manager = {
        presentation: undefined,
        setPresentation(presentation) {
            this.presentation = presentation;
        },
        has(name) {
            return hashes.has(name);
        },
        getData(name) {
            if (hashes.has(name)) {
                return hashes.get(name);
            } else {
                return null;
            }
        },
        register(name, onEnter, onLeave) {
            if (typeof name !== "string") {
                throw new TypeError("Hash name must be a string");
            }
            if (name === "") {
                throw new TypeError("Hash name cannot be empty");
            }
            if (typeof onEnter !== "function") {
                throw new TypeError(`Parameter #2 "onEnter" must be a function`);
            }
            if (typeof onLeave !== "function") {
                throw new TypeError(`Parameter #3 "onLeave" must be a function`);
            }
            hashes.set(name, { onEnter, onLeave });
        },
        unregister(name) {
            const result = hashes.delete(name);
            if (!result) {
                return null;
            }
            return true;
        },
        checkCurrent() {
            if (location.hash) {
                const hashName = location.hash.substring(1);
                if (hashes.has(hashName)) {
                    const { onEnter } = hashes.get(hashName);
                    onEnter(this.presentation);
                }
            }
        },
        reactToChange(oldURL, newURL, origin) {
            oldURL = new URL(oldURL);
            newURL = new URL(newURL);
            let oldHash = oldURL.hash;
            let newHash = newURL.hash;
            // Hash removed
            // "leave" goes before "enter"
            if (oldHash !== "") {
                oldHash = oldHash.substring(1);
                if (hashes.has(oldHash)) {
                    const { onLeave } = hashes.get(oldHash);
                    onLeave({ presentation: this.presentation, oldURL, newURL, origin });
                }
            }
            // Hash added
            if (newHash !== "") {
                newHash = newHash.substring(1);
                if (hashes.has(newHash)) {
                    const { onEnter } = hashes.get(newHash);
                    onEnter({ presentation: this.presentation, oldURL, newURL, origin });
                }
            }
        },
        stripHashPrefix(value) {
            return value.startsWith("#") ? value.substring(1) : value;
        }
    }
    Object.seal(manager);
    addEventListener("hashchange", e => {
        let { oldURL, newURL, origin } = e;
        manager.reactToChange(oldURL, newURL, origin);
    });
    return manager;
})();