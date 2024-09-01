"use strict";

import { createElement } from "../../../../src/core/functions/node.js";
import { Feature } from "../../../../src/core/component/feature.js";
import { ArrayStoreManager } from "../../../../src/core/store/array-store-manager.js";
import { StoreListing } from "../../../../src/element/listing/store-listing.js";
import { Navigation } from "../../../../src/element/navigation.js";
import { colorMode } from "../../../../src/components/color-mode.js";
import { Site, SiteComponent, siteComponents } from "../../../../src/site/site.js";
import { MainOnlyTemplate } from "../../../../src/site/templates/main-only-template.js";
import { items } from "../stores/products.js";

export class MainTemplate extends MainOnlyTemplate {
    static #mainNavigationSchema = {
        home: {
            url: "./home.html",
            title: "Home",
        },
        products: {
            url: "./products.html",
            title: "Products",
        },
        contact: {
            url: "./contact.html",
            title: "Contact",
        },
    }
    constructor(data) {
        super(data);
        const colorModeStoreController = colorMode.defaultLocalStorageStoreController;
        colorModeStoreController.key = "testRepresentationalSiteColorMode";
        colorMode.setCustomStoreController(colorModeStoreController, { apply: true });
    }
    getParts() {
        const nodes = new Set;
        const container = MainTemplate.buildContainerElement();
        const siteHeader = container.querySelector(":scope > .site-header");
        const main = container.querySelector(":scope > main");
        const header = this.buildHeader();
        const footer = this.buildFooter();
        siteHeader.replaceWith(header);
        container.append(footer);
        nodes.add(container);
        return { nodes, main };
    }
    buildHeader() {
        const navigation = this.buildHeaderNavigation();
        const colorModeMenu = colorMode.releaseMenu();
        colorModeMenu.element.classList.add("color-mode-menu");
        const header = createElement("header", {
            classes: ["site-header"],
            elems: [colorModeMenu.element, navigation.element],
        });
        return header;
    }
    buildHeaderNavigation() {
        return Navigation.fromSchema(MainTemplate.#mainNavigationSchema, {
            hyperlinkBuilder: Site.getHyperlinkBuilder(),
            heading: "Header Navigation",
        });
    }
    buildFooter() {
        const navigation = this.buildFooterNavigation();
        const footer = createElement("footer", {
            classes: ["site-footer"],
            elems: [navigation.element],
        });
        return footer;
    }
    buildFooterNavigation() {
        const navigation = Navigation.fromSchema({ ...MainTemplate.#mainNavigationSchema, ...{
            terms: {
                url: "./terms-and-conditions.html",
                title: "Terms & Conditions",
            },
            privacy: {
                url: "./privacy-policy.html",
                title: "Privacy Policy",
            }
        }}, {
            hyperlinkBuilder: Site.getHyperlinkBuilder(),
            heading: "Footer Navigation",
        });
        return navigation;
    }
    async addComponentsByPageName(pageName, view, { origin } = {}) {
        switch (pageName) {
            case "products": {
                let component;
                let filteredComponent;
                if (origin === "popstate") {
                    filteredComponent = siteComponents.findFirstByProperty("name", "products-listing");
                }
                if (!filteredComponent) {
                    const store = new ArrayStoreManager(items);
                    const properties = {
                        name: "Name",
                        category: "Category",
                        price: "Price",
                        brand: "Brand",
                        stock: "Stock",
                    };
                    const listing = new StoreListing(store, "Listing", {
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
                            const nameBlock = item.querySelector(`[data-name="name"]`);
                            // Replace with visit hyperlink
                            if (nameBlock) {
                                const originalContent = nameBlock.innerHTML;
                                const visitHyperlink = listing.createVisitHyperlink(key, element, { content: originalContent });
                                nameBlock.replaceChildren(visitHyperlink);
                            }
                        },
                        hyperlinkBuilder: Site.getHyperlinkBuilder(),
                        urlBuilders: {
                            // eslint-disable-next-line no-unused-vars
                            visit: ({ key, element }) => {
                                return "./product.html";
                            }
                        }
                    });
                    const extendedPagingMenu = listing.releaseExtendedPagingLandmark();
                    extendedPagingMenu?.appendTo(listing.footer);
                    const orderMenu = listing.createControlBySearchParam("order");
                    orderMenu?.appendTo(listing.footer);
                    const sortMenu = listing.createControlBySearchParam("sort");
                    sortMenu?.appendTo(listing.footer);
                    const perPageMenu = listing.releasePerPageMenu();
                    perPageMenu?.appendTo(listing.footer);
                    const feature = new Feature(listing, "products-listing");
                    component = new SiteComponent(feature, {
                        category: SiteComponent.categories.page,
                        name: "products-listing",
                    });
                } else {
                    component = filteredComponent;
                }
                view.addComponent(component);
                view.main.append(component.element);
                break;
            }
        }
    }
}