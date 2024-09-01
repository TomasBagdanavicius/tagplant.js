"use strict";

export class FormElementsBuilder {
    convertType(type, config) {
        switch (type) {
            case "string":
                type = "text";
                break;
            case "email_address":
                type = "email";
                break;
            case "boolean":
                type = "checkbox";
                break;
            case "integer":
                type = "number";
                break;
            case "text":
                type = "textarea";
                break;
        }
        if (config.relationship) {
            type = "reference-select";
        }
        if (config.set) {
            type = "select";
        }
        return type;
    }
}