# Tagplant.js Contribution Guide

## Amending the Source Code

- All source code is organized within the [`./src`](src) directory.
- The primary directory within [`./src`](src) is [`./src/core`](src/core). Files within the [`./src/core`](src/core) directory must not have dependencies outside of this directory. All ES module imports should reference files within the [`./src`](src) directory only.
- Carefully review the file structure of the [`./src`](src) directory to determine the most appropriate location for your code. For example, if you are working on something related to HTML elements, consider placing it in the [`./src/element`](src/element) directory. Similarly, if you're creating a web worker, it should be located in the [`./src/workers`](src/workers) directory.

## Creating a Unit Test

- All unit tests are organized within the [`./test`](test) directory.
- This project uses [Mocha.js](https://mochajs.org/) for unit testing. The configuration file can be found at [./.mocharc.yaml](.mocharc.yaml)
- The structure of the [`./test`](test) directory should generally mirror that of the [`./src`](src) directory. For instance, if you need to write a unit test for a file located at `./src/foo/bar.js`, you should create a corresponding test file at `./test/foo/bar.test.js`. Alternatively, you can create a directory `./test/foo/bar` and place multiple test files for that specific source file inside it.
- To verify that your test, along with the other tests, is working correctly, run `npm test`.

## Creating a Demo

- All demo files are organized within the [`./demo`](demo) directory.
- Similar to the unit tests, the structure of the [`./demo`](demo) directory should generally mirror that of the [`./src`](src) directory. For example, if you want to create a demo for [`./src/core/constraints/minlength-constraint.js`](src/core/constraints/minlength-constraint.js), you should either create a corresponding file at `./demo/core/constraints/minlength-constraint.html` or a directory at `./demo/core/constraints/minlength-constraint` with separate demo files inside it.
- If your demo showcases a major feature, consider adding it to the featured slides in [`./demo/slides.html`](demo/slides.html).

## Publishing Your Work to Github

- Before submitting your work, consider creating a GitHub issue to outline the problem you're trying to solve. This allows for discussion and feedback before you start coding.
- Once your work is complete, [create a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request) so that it can be reviewed by others. This ensures that your contributions are aligned with the project's standards and goals.