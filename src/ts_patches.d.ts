// Force all element fetching to have the type any, so avoid type errors

interface GenericElement extends HTMLDivElement, HTMLInputElement {
    [other_property: string]: any

    addEventListener(
        type: string,
        listener: (ev: Event & CustomEvent & MouseEvent & KeyboardEvent) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
}

interface DocumentFragment {
    getElementById(elementId: string): GenericElement;
    createElement(tagName: string, options?: ElementCreationOptions): GenericElement;
}

interface Document  {
    createElement(tagName: string, options?: ElementCreationOptions): GenericElement;
}

interface ParentNode {
    querySelectorAll(selectors: string): GenericElement[];
    querySelector(selectors: string): GenericElement;
}

interface EventTarget {
    addEventListener(
        type: string,
        listener: (ev: Event & CustomEvent & MouseEvent & KeyboardEvent) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
}

// Note: this is needed as targetOrigin is implicit for web workers
declare function postMessage(message: any, targetOrigin?: string, transfer?: Transferable[]): void;

// Add unadded ace definitions

declare namespace AceAjax {
    export interface VirtualRenderer {
        on(arg0: string, arg1: (event: any) => void);
        once(event_name: string, func: (e: any) => any);
        attachToShadowRoot(): void;
    }

    export interface IEditSession {
        gutterRenderer: {
            getText: (session: any, row: any) => string;
            getWidth: (session: any, lastLineNumber: any, config: any) => number;
        }

        replace(range: MinimalRange, text: string): any;
    }

    export interface Ace {
        UndoManager: any;
        config: any;
    }

    export interface CommandManager {
        on(arg0: string, arg1: (event: any) => void);
        once(event_name: string, func: (e: any) => any);
    }

    export interface Editor {
        completer: any;
    }

    export interface MinimalRange {
        start: {row: number, column: number},
        end: {row: number, column: number}
    }
}

// This means we can add any properties we like to window
interface Window {
    [index: string]: any;
};

declare var wire: any;
declare var hyper: any;
