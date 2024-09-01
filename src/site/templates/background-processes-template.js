"use strict";

import { createHyperlink } from "../../core/functions/node.js";
import { OptionsMixin } from "../../core/mixins/options.js";
import { Menu } from "../../element/menu.js";
import { globalJobs } from "../../process/jobs.js";
import { processesCenter } from "../../process/process-log.js";
import { NotificationsCenterSessionStoreHandler, SiteNotification } from "../../components/site-notifications.js";
import { Popup } from "../../components/popover.js";
import { Template } from "../template.js";
import { Process } from "../../process/process.js";
import { Site } from "../site.js";

export class BackgroundProcessesTemplate extends OptionsMixin({ parentConstructor: Template }) {
    static #defaultOptions = {
        includeNotifications: true,
        notificationsSessionStore: false,
        includeProcesses: true,
        includeJobs: true,
    }
    constructor(data, options = {}) {
        super([data], BackgroundProcessesTemplate.#defaultOptions, options);
        this.#registerHashes();
    }
    #registerHashes() {
        let notificationsPopup;
        let processesPopup;
        let jobsPopup;
        const createPopup = (element, title, classes = []) => {
            return new Popup(element, {
                title,
                onClose: () => {
                    Site.popHash();
                },
                classes,
            });
        };
        const hashes = {};
        if (this.options.includeNotifications) {
            hashes.notifications = {
                onEnter: () => {
                    const listing = this.data.notificationsCenter.releaseListing({
                        hideOnCancel: false,
                        includeDeleteButton: true,
                        includeControls: true,
                        customOptions: {
                            format: "chunks",
                            includeHead: true,
                            headItemSort: "button",
                            chunkNames: SiteNotification.chunkNames,
                            sortValues: SiteNotification.sortValues,
                            createMenuForEachItem: "toggle",
                            onHeadItems: items => {
                                items.unshift(["select", ""]);
                            },
                            selectItems: true,
                            itemBindings: ({ item, controls: { select } }) => {
                                if (select) {
                                    const selectItemCell = listing.options.groupMemberBuilder.buildCell("select");
                                    selectItemCell.prepend(select);
                                    item.prepend(selectItemCell);
                                }
                            }
                        }
                    });
                    notificationsPopup = createPopup(listing.element, "Notifications", ["notifications-popup"]);
                    listing.element.classList.add("listing-notifications");
                    const controlsMenu = listing.releaseControlsMenu({ includeDeleteSelected: true });
                    controlsMenu.element.classList.add("select-items");
                    controlsMenu.appendTo(listing.footer);
                    notificationsPopup.show();
                },
                onLeave: () => {
                    notificationsPopup.remove();
                    notificationsPopup = undefined;
                }
            };
        }
        if (this.options.includeProcesses) {
            hashes.processes = {
                onEnter: () => {
                    const listing = processesCenter.releaseListing({
                        customOptions: {
                            format: "chunks",
                            includeHead: true,
                            headItemSort: "button",
                            chunkNames: Process.chunkNames,
                            sortValues: Process.sortValues,
                            createMenuForEachItem: "toggle",
                            onHeadItems: items => {
                                items.unshift(["select", ""]);
                            },
                            selectItems: true,
                            itemBindings: ({ item, controls: { select } }) => {
                                if (select) {
                                    const selectItemCell = listing.options.groupMemberBuilder.buildCell("select");
                                    selectItemCell.prepend(select);
                                    item.prepend(selectItemCell);
                                }
                            }
                        },
                    });
                    processesPopup = createPopup(listing.element, "Processes", ["processes-popup"]);
                    listing.element.classList.add("listing-processes");
                    processesPopup.show();
                },
                onLeave: () => {
                    processesPopup.remove();
                    processesPopup = undefined;
                }
            };
        }
        if (this.options.includeJobs) {
            hashes.jobs = {
                onEnter: () => {
                    const listingElement = globalJobs.toElement();
                    jobsPopup = createPopup(listingElement, "Jobs");
                    jobsPopup.show();
                },
                onLeave: () => {
                    jobsPopup.remove();
                    jobsPopup = undefined;
                }
            };
        }
        this.registerHashes(hashes);
    }
    getParts() {
        const nodes = new Set;
        if (this.options.includeProcesses) {
            const processesCenterArticle = processesCenter.toElementRepresentative({ includeCombinedProcessesStatus: false });
            processesCenterArticle.addFooter();
            const menu = new Menu({ headingText: "Options", host: processesCenterArticle.footer });
            const hyperlink = createHyperlink("#processes", "Manage Processes");
            menu.append(hyperlink, "manageProcesses");
            menu.appendTo(processesCenterArticle.footer);
            nodes.add(processesCenterArticle.element);
        }
        if (this.options.includeNotifications) {
            if (this.options.notificationsSessionStore) {
                const notificationsCenterStoreHandler = new NotificationsCenterSessionStoreHandler(this.data.notificationsCenter, "siteNotifications");
                notificationsCenterStoreHandler.enable();
            }
            const [siteNotificationsArticle, siteNotificationsListing] = this.data.notificationsCenter.toComponents({
                id: "site-notifications",
                cancelOnClick: false,
                includeDeleteButton: false,
                includeControls: false,
                includeListingManager: false,
            });
            nodes.add(siteNotificationsArticle.element);
            const menu = new Menu({ headingText: "Options", host: siteNotificationsListing.footer });
            const hyperlink = createHyperlink("#notifications", "Manage Notifications");
            menu.append(hyperlink, "manageListing");
            menu.appendTo(siteNotificationsListing.footer);
        }
        return { nodes };
    }
}