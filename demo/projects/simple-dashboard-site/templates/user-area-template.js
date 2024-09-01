"use strict";

import { createElement, createHyperlink } from "../../../../src/core/functions/node.js";
import { ComponentCollection } from "../../../../src/core/component/component-collection.js";
import { ArrayStoreManager } from "../../../../src/core/store/array-store-manager.js";
import { DynamicFeature, Feature } from "../../../../src/core/component/feature.js";
import { Menu } from "../../../../src/element/menu.js";
import { StoreListing } from "../../../../src/element/listing/store-listing.js";
import { Navigation } from "../../../../src/element/navigation.js";
import { colorMode } from "../../../../src/components/color-mode.js";
import { fullscreen } from "../../../../src/components/fullscreen.js";
import { Site, SiteComponent, siteComponents } from "../../../../src/site/site.js";
import { Template } from "../../../../src/site/template.js";
import { colorModeAPIController } from "../../../helpers/color-mode-store-controllers.js";
import { countries as countriesStore } from "../stores/countries.js";
import { people as peopleStore } from "../stores/people.js";
import { userPaths } from "../../../../var/paths.js";

export class UserAreaTemplate extends Template {
    constructor(data) {
        super(data);
    }
    getParts() {
        const nodes = new Set;
        const components = new ComponentCollection;
        const refs = {};
        const containerElem = Template.buildContainerElement(refs);
        const { header, main } = refs;
        nodes.add(containerElem);
        const siteMenuComponent = UserAreaTemplate.buildSiteMenuComponent(this.data.endpoints.logout, {
            defaultColorMode: this.data.settings.colorMode,
        });
        components.add(siteMenuComponent);
        header.append(siteMenuComponent.element);
        const aside = createElement("aside", { classes: ["site-aside"] });
        const navigation = Navigation.fromSchema({
            countries: {
                title: "Countries",
                url: "./dashboard.json",
            },
            people: {
                title: "People",
                url: "./people.json",
            }
        }, { hyperlinkBuilder: Site.getHyperlinkBuilder() });
        aside.append(navigation.element);
        containerElem.append(aside);
        return { nodes, components, main };
    }
    static buildSiteMenu(logoutURL) {
        const menu = new Menu({ headingText: "Site Menu", classes: ["site-menu"] });
        const fullscreenToggler = fullscreen.releaseToggler();
        const colorModeToggler = colorMode.releaseTogglerButton();
        menu.append(colorModeToggler, "colorMode");
        menu.append(fullscreenToggler, "fullscreen");
        const notificationsHyperlink = createHyperlink("#notifications", "Notifications");
        notificationsHyperlink.title = "Notifications";
        menu.append(notificationsHyperlink, "notifications");
        const processesHyperlink = createHyperlink("#processes", "Processes");
        processesHyperlink.title = "Processes";
        menu.append(processesHyperlink, "processes");
        const [, , logoutButton] = menu.appendButton("Logout", "logout");
        logoutButton.title = "Logout";
        logoutButton.addEventListener("click", () => {
            Site.navigateTo(logoutURL);
        });
        return menu;
    }
    // eslint-disable-next-line no-unused-vars
    static buildSiteMenuFeature(logoutURL, { defaultColorMode = "os" } = {}) {
        const menu = UserAreaTemplate.buildSiteMenu(logoutURL);
        const activate = () => {
            colorModeAPIController.fetchURL = `${userPaths.project}/demo/api/fetch-color-mode.php`;
            colorModeAPIController.saveURL = `${userPaths.project}/demo/api/save-color-mode.php`;
            colorMode.setCustomStoreController(colorModeAPIController, { apply: true });
        }
        const deactivate = () => {
            colorMode.unsetCustomStoreController();
        }
        return new DynamicFeature(menu, "site-menu", activate, deactivate);
    }
    static buildSiteMenuComponent(logoutURL, { defaultColorMode = "os" } = {}) {
        return new SiteComponent(this.buildSiteMenuFeature(logoutURL, { defaultColorMode }), { name: "site-menu" });
    }
    async addComponentsByPageName(pageName, view, { origin } = {}) {
        let featureName;
        if (pageName === "dashboard") {
            featureName = "countries-listing";
        } else if (pageName === "people") {
            featureName = "people-listing";
        }
        let component;
        let filteredComponent;
        if (origin === "popstate") {
            filteredComponent = siteComponents.findFirstByProperty("name", featureName);
        }
        if (!filteredComponent) {
            let properties;
            let store;
            let title;
            let mainColumn;
            switch (pageName) {
                case "dashboard":
                    properties = {
                        title: "Title",
                        name: "Name",
                        short_title: "Short Title",
                        iso_3166_1_alpha_2_code: "2-Letter Code",
                        iso_3166_1_alpha_3_code: "3-Letter Code",
                        iso_3166_1_numeric_code: "Numeric Code",
                    };
                    store = new ArrayStoreManager(JSON.parse(countriesStore));
                    title = "Countries";
                    mainColumn = "title";
                    featureName = "countries-listing";
                break;
                case "people":
                    properties = {
                        first_name: "First Name",
                        last_name: "Last Name",
                        profession: "Profession",
                        age: "Age",
                        city: "City",
                    };
                    store = new ArrayStoreManager(JSON.parse(peopleStore));
                    title = "People";
                    mainColumn = "first_name";
                    featureName = "people-listing";
                break;
            }
            const listing = new StoreListing(store, title, {
                searchable: true,
                searchParams: {
                    perPage: 10
                },
                perPageValues: [5, 10, 15],
                sortValues: properties,
                includePaging: false,
                format: "chunks",
                chunkNames: properties,
                includeHead: true,
                headItemSort: "button",
                useURLQuery: true,
                publishToURLQuery: Site.getURLQueryParamsPublisher(),
                itemBindings: ({ item, key, element }) => {
                    const mainColumnBlock = item.querySelector(`[data-name="${mainColumn}"]`);
                    // Replace with visit hyperlink
                    if (mainColumnBlock) {
                        const originalContent = mainColumnBlock.innerHTML;
                        const visitHyperlink = listing.createVisitHyperlink(key, element, { content: originalContent });
                        mainColumnBlock.replaceChildren(visitHyperlink);
                    }
                },
                hyperlinkBuilder: Site.getHyperlinkBuilder(),
                urlBuilders: {
                    // eslint-disable-next-line no-unused-vars
                    visit: ({ key, element }) => {
                        return "./product.json";
                    }
                }
            });
            const extendedPagingMenu = listing.releaseExtendedPagingLandmark();
            extendedPagingMenu?.appendTo(listing.footer);
            const perPageMenu = listing.releasePerPageMenu();
            perPageMenu?.appendTo(listing.footer);
            const feature = new Feature(listing, featureName);
            component = new SiteComponent(feature, {
                category: SiteComponent.categories.page,
                name: featureName,
            });
        } else {
            component = filteredComponent;
        }
        view.addComponent(component);
        view.main.append(component.element);
    }
}