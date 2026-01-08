import { Window } from 'happy-dom';

// Setup happy-dom for React testing
const window = new Window();
const document = window.document;

// @ts-ignore
globalThis.window = window;
// @ts-ignore
globalThis.document = document;
// @ts-ignore
globalThis.navigator = window.navigator;
// @ts-ignore
globalThis.HTMLElement = window.HTMLElement;
// @ts-ignore
globalThis.Element = window.Element;
