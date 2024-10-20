"use strict";

import { customFormElementsRegistry } from "./custom-form-element.js";
import { FormElementsBuilder } from "./form-elements-builder.js";
import { Form } from "./form.js";
// eslint-disable-next-line no-unused-vars
import { CheckBoxElement } from "./checkbox-element.js";
// eslint-disable-next-line no-unused-vars
import { ReferenceSelect } from "./reference-select.js";
// eslint-disable-next-line no-unused-vars
import { FormSelectMenu } from "./form-select-menu.js";
import { userPaths } from "../../../var/paths.js";

export class CustomFormElementsBuilder extends FormElementsBuilder {
    constructor() {
        super();
    }
    createFormElement(name, config, formId) {
        const type = this.convertType(config.genericType ?? config.type, config);
        const registry = customFormElementsRegistry.byType(type);
        if (registry === null) {
            return null;
        }
        const [, className] = registry;
        const attrs = {
            controlsmenu: "toggle",
            controlsfilter: "none",
        };
        const toAttrsIfExists = {
            title: "label",
            min: "minlength",
            max: "maxlength",
            description: "description",
        };
        if (config.required) {
            attrs.required = "";
        }
        let stylesheetPath;
        if (userPaths?.stylesheets?.formElement) {
            stylesheetPath = userPaths.stylesheets.formElement;
        }
        switch (type) {
            case "checkbox":
                if (userPaths?.stylesheets?.checkbox) {
                    stylesheetPath = userPaths.stylesheets.checkbox;
                }
                //#todo: can this be left?
                attrs.value = "1";
                attrs.controlsmenu = "off";
                break;
            case "select":
                if (userPaths?.stylesheets?.selectMenu) {
                    stylesheetPath = userPaths.stylesheets.selectMenu;
                }
                break;
            case "reference-select":
                if (userPaths?.stylesheets?.referenceSelect) {
                    stylesheetPath = userPaths.stylesheets.referenceSelect;
                }
                attrs.url = config.relationshipOtherModule;
                attrs["module-title"] = config.relationshipOtherModuleTitle;
                break;
        }
        if (stylesheetPath) {
            attrs.stylesheet = stylesheetPath;
        }
        if (formId) {
            attrs.id = Form.buildIdFromName(name, formId);
        }
        for (const [name, value] of Object.entries(toAttrsIfExists)) {
            if (Object.hasOwn(config, name)) {
                if ((value === "minlength" || value === "maxlength") && type === "number") {
                    attrs[name] = config[name];
                } else {
                    attrs[value] = config[name];
                }
            }
        }
        const customFormElement = className.createCustomElement(name, attrs);
        if ("value" in config && typeof config.value === "string") {
            customFormElement.setValue(config.value);
        }
        if (type === "select") {
            for (const [key, value] of Object.entries(config.set)) {
                customFormElement.addOption(value, key);
            }
        }
        return customFormElement;
    }
    wrap(type, elements) {
        // No wrapper.
        return elements[0];
        // In case, a wrapper was needed
        /* return createElement("div", { elems: elements }); */
    }
    getWrapperElements(name, config, formId) {
        const formElement = this.createFormElement(name, config, formId);
        const type = this.convertType(config.genericType, config);
        const wrapper = this.wrap(type, [formElement]);
        return { wrapper, element: formElement };
    }
}