import { terser } from "rollup-plugin-terser";
import path from "path";
import glob from "glob";

// Get all JavaScript files in the "./var/scripts" directory
const scriptFiles = glob.sync('./var/scripts/*.js');
const format = process.env.ROLLUP_FORMAT || 'iife';

// Function to generate Rollup configuration for each file
const createConfigs = file => {
    const fileName = path.basename(file, path.extname(file));
    const commonConfig = {
        output: {
            dir: "./dist",
            format,
            sourcemap: false, // Adjust this if you need sourcemaps
        },
        treeshake: {
            moduleSideEffects: false,
        },
    };
    return [
        // Uncompressed version
        {
            ...commonConfig,
            input: file,
            output: {
                ...commonConfig.output,
                entryFileNames: `${fileName}.js`,
            },
            plugins: [],
        },
        // Minified version
        {
            ...commonConfig,
            input: file,
            output: {
                ...commonConfig.output,
                entryFileNames: `${fileName}.min.js`,
            },
            plugins: [
                terser({
                    compress: {
                        drop_console: true, // This removes all console.* statements
                    }
                })
            ],
        }
    ];
};

// Generate the complete configuration array by mapping each file to its configurations
export default scriptFiles.flatMap(createConfigs);