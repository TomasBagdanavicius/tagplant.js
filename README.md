# Tagplant.js

Tagplant.js is a modular vanilla JavaScript framework and code library. It leverages ES modules to organize the code, allowing you to use JavaScript bundlers to extract and build only the parts you need for your application. While primarily designed for web applications, Tagplant.js is versatile enough to support the development of other systems that require JavaScript as well.

## Quick Start

- Download or clone the repository files. If you already have an HTTP server set up, consider copying the files into the server's document directory. Otherwise, you will be able to use the provided [Docker options](#starting-the-web-application-using-docker) to get started.
- Make sure you have [Node.js](https://nodejs.org/en/download/package-manager) installed.
- Inside the project directory run `npm install` to install all developer dependencies. This will create the `/node_modules` directory and the `package-lock.json` file.

### Creating and Building Custom Scripts

- Create your custom JS file inside [`./var/scripts`](var/scripts) directory, eg. [`example.js`](var/scripts/example.js).
    - You can create as many files as you need; there is no limit. The system will compile all files within the [`./var/scripts`](var/scripts) directory.
- Duplicate the [./var/paths.config.js](/var/paths.config.js) file and rename it to `paths.js`. Open it and set up the correct paths.
- In the project directory, run `npm run build:[output_format]`.
    - The project uses [Rollup](https://rollupjs.org/) to bundle and minify your custom JavaScript files, leveraging the ES module structure.
    - The output format can be selected from the options listed in the [Rollup configuration](https://rollupjs.org/configuration-options/#output-format). By default, the format is set to `iife`.
        - If your source code uses the `import()` expression (dynamic import), you must choose one of the following formats for code splitting: `es`, `system`, or `amd`.
    - Each custom script will be build into two variants in the [`./dist`](dist) directory - (1) bundled and (2) bundled and minified.
    - You can also use other bundlers if preferred.

### Launching Web Interface

If you didn't use your own HTTP server and place the files in its document root, you can use Docker for a quick web setup. If you chose to use your own HTTP server, you need to modify the `projectURL` in the [./var/paths.js](/var/paths.js) file.

#### Starting the Web Application Using Docker

- Make sure you have [Docker](https://docs.docker.com/get-docker/) installed and running on your system.
- Create a Docker image by running `docker build -t tagplant .` inside the project directory.
- Run and map the port `docker run -p 8081:8081 -d tagplant`.
    - You can customize the port by amending the host port, eg. `docker run -p [custom_host_port]:8081 -d tagplant`.
- Navigate to http://localhost:8081 in your browser. If you chose a custom port, make sure to change it in the URL.
- To stop Docker container, run `docker stop [container_id]`. Docker must have printed your container ID into the console after you ran the docker container. Alternatively, you can run `docker ps` to get a list of running containers.

#### Viewing Demo Files

A great way to familiarize yourself with the project's components and features is to browse the demo files located in the [`./demo`](demo) directory.

To make it easier to explore the key demo files, the project includes a set of slides that guide you through the main features. Simply navigate to [authority][`/demo/slides.html`](demo/slides.html) (mind that this is relative path) in your browser to view the slides.

#### Running Experimental Demo Projects

This project includes two demo websites: (1) [a simple dashboard site](demo/projects/simple-dashboard-site/) and (2) [a simple representational site](demo/projects/representational-site/). These demos are headless and do not have pre-built HTML structures; instead, they are dynamically generated using JavaScript libraries. These projects demonstrate how you can use Tagplant.js to build a simple web application from scratch.

## Running Unit Tests

Tagplant.js uses [Mocha.js](https://mochajs.org/) for unit testing. To run all tests, you can use the command `npm test` (or alternatively `node --experimental-vm-modules --no-deprecation node_modules/mocha/bin/mocha.js`).

## Related Project

To generate all stylesheets for demo files this project uses [Firstile CSS](https://github.com/TomasBagdanavicius/firstile-css).

## Contributing

We welcome contributions from everyone! Whether you're fixing bugs, suggesting features, improving documentation, or adding new functionality, your input is invaluable to us.

For detailed contribution guidelines, please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file.

## Licensing

Tagplant.js is released under the [MIT License](LICENSE). The source code has no dependencies whatsoever and thus is not dependent upon any 3rd party licensing conditions.