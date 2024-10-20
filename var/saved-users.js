"use strict";

import { stringTemplate } from "../src/core/functions/string.js";
import { getTextValue } from "../src/core/functions/misc.js";
import { valueToElement } from "../src/core/functions/node.js";
import { addEventListeners } from "../src/core/events/functions.js";
import { IndexedDBStoreManager } from "../src/core/store/indexed-db-store-manager.js";
import { PagedListing } from "../src/element/listing/extensions/paged-listing.js";
import { StoreListing } from "../src/element/listing/store-listing.js";
import { Article } from "../src/element/article.js";
import { Popup } from "../src/components/popover.js";
import { notificationsCenter } from "../src/components/site-notifications.js";
import { dateTimeFormats } from "./date-time-formats.js";
import { landingDatabaseManager } from "./indexed-databases.js";

export async function savedUsers(storeName, itemTemplate) {
    let listing;
    const bindItem = (item, user, menu) => {
        const [, , chooseButton] = menu.appendButton("Choose", "choose", { classes: ["choose-button"] });
        menu.element.setAttribute("slot", "menu");
        menu.appendTo(item);
        let chooseEls = item.shadowRoot.querySelectorAll(`slot[name="image"],slot[name="name"]`);
        chooseEls = Array.from(chooseEls);
        chooseEls.push(...Array.from(item.querySelectorAll(`[slot="image"],[slot="name"]`)));
        chooseEls.forEach(el => {
            el.classList.add("clickable");
        });
        chooseEls.push(chooseButton);
        addEventListeners(Array.from(chooseEls), "click", e => {
            e.stopPropagation();
            const message = `Chose saved user ${getTextValue(user, "username")}`;
            notificationsCenter.sendText(message);
            console.debug(message, user);
            listing.dispatchEvent(new CustomEvent("chosensaveduser", {
                detail: { user }
            }));
        });
    }
    const store = new IndexedDBStoreManager(landingDatabaseManager, storeName);
    listing = new StoreListing(store, "Saved Users", {
        classes: ["listing-saved-users"],
        keyAsDataId: true,
        paging: PagedListing.pagingMethods.regular,
        searchParams: {
            perPage: 2,
        },
        sortValues: {
            name: "Name",
            username: "Username",
        },
        includeMenu: {
            manage: {
                title: "Manage Saved Users",
                popupTitle: "Saved Users",
                classes: ["saved-users-popup"]
            }
        },
        searchable: true,
        itemTemplate,
        itemName: "saved-user",
        createMenuForEachItem: "toggle",
        itemBindings: ({ item, element: user, controls: { releaseMenu } }) => {
            const menu = releaseMenu({ exclude: ["edit"] });
            if (item.isConnected) {
                bindItem(item, user, menu);
            } else {
                item.addEventListener("connected", () => {
                    bindItem(item, user, menu);
                });
            }
        },
        onVisit: ({ element, event: e }) => {
            e.preventDefault();
            const schema = {
                title: element.name,
                data: Object.create(null),
            };
            for (let [name, value] of Object.entries(element)) {
                const elem = valueToElement(value);
                if (name === "timeCreated") {
                    const formatter = new Intl.DateTimeFormat(document.documentElement.lang, dateTimeFormats.ExtendedDateTime.options);
                    elem.innerText = formatter.format(new Date(value));
                }
                schema.data[name] = { value: elem };
            }
            const article = Article.fromSchema(schema);
            const popup = new Popup(article.element, {
                title: element.name,
                onClose: () => {
                    popup.remove();
                }
            });
            popup.show();
        },
        deleteEntriesMessages: {
            confirm: {
                one: ({ originalElement: savedUser }) => `Do you really want to delete ${getTextValue(savedUser, "name")} from saved users?`,
                many: stringTemplate`Do you really want to delete ${"count"} saved users?`
            },
            complete: {
                done: {
                    one: ({ originalElement: savedUser }) => `Saved user ${getTextValue(savedUser, "name")} deleted`,
                    many: stringTemplate`${"count"} saved users deleted`
                },
                error: {
                    fail: ({ keys }) => {
                        if (keys.length === 1) {
                            return "Failed to delete saved user";
                        } else {
                            return `Failed to delete ${keys.length} saved users`;
                        }
                    },
                    mixed: data => {
                        const { errorCount, count } = data;
                        if (errorCount === count) {
                            return `Failed to delete ${count} saved users`;
                        } else {
                            return `Could not delete ${errorCount} out of ${count} saved users`;
                        }
                    },
                }
            },
            notifier: (message, type) => {
                notificationsCenter.sendParams(message, { type });
            }
        }
    });
    return listing;
};