import globals from "globals";
import pluginJs from "@eslint/js";

export default [
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.mocha,
                // Add custom global variable here
                global: "readonly",
            },
            ecmaVersion: "latest",
            sourceType: "module",
        },
        rules: {
            "no-var": "error",
            "no-multi-spaces": "error"
        },
    },
    // ESLint's recommended config for JavaScript
    pluginJs.configs.recommended,
];