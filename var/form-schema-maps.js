"use strict";

export const formMap = {
    title: "title",
    subtitle: "subtitle",
    submitText: "request.title",
    method: "request_method",
    pageName: "page_name",
    requestURL: "request.url",
    bracketPrefix: "bracket_prefix",
    data: "data",
    navigation: "navigation",
};

export const formElementMap = {
    type: "type",
    subtype: "subtype",
    genericType: ["subtype", "type"],
    title: "title",
    required: "required",
    set: ["in_set.set", "in_set"],
    relationship: "relationship",
    relationshipOtherModule: "relationship.other_module_url",
    relationshipOtherModuleTitle: "relationship.other_module_title",
    min: "min",
    max: "max",
    description: "description",
    match: "match",
    allowEmpty: "allow_empty",
    value: "value",
};