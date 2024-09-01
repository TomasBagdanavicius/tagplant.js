import { JSDOM } from "jsdom";

// Create a JSDOM instance with an HTML document
const { window } = new JSDOM(`<!DOCTYPE html><html lang="en-US"><head></head><body></body></html>`, {
    url: "http://localhost",
});

// Define main globals for the tests
global.document = window.document;
global.window = window;
global.Node = window.Node;
global.Element = window.Element;
global.HTMLElement = window.HTMLElement;
global.DocumentFragment = window.DocumentFragment;
global.Event = window.Event;
global.EventTarget = window.EventTarget;
global.CustomEvent = window.CustomEvent;