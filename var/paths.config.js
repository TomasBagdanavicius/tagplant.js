"use strict";

// URL pointing to the root directory of this project
const projectURL = "";
const stylesheetsURL = `${projectURL}demo/stylesheets/`;
export const userPaths = {
    project: projectURL,
    stylesheetsURL,
    stylesheets: {
        checkbox: `${stylesheetsURL}checkbox.min.css`,
        checkboxClassic: `${stylesheetsURL}checkbox-classic.min.css`,
        selectMenu: undefined,
        referenceSelect: undefined,
        formElement: `${stylesheetsURL}form-element.min.css`,
        siteNotificationCard: undefined,
        dialog: `${stylesheetsURL}dialog.min.css`,
        fullscreenToggler: `${stylesheetsURL}fullscreen-toggler.min.css`,
    },
    workers: `${projectURL}src/workers/`,
    // URL for the API endpoint that provides a list of items with support for search, sorting, and ordering. If you are not planning to use the `ApiListing` component, you can leave this empty.
    apiListingEndpoint: "",
};