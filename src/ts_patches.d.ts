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

interface HTMLElement {
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

    export type Range = MinimalRange;
}

// This means we can add any properties we like to window
interface Window {
    [index: string]: any;
};


type TemplateFunction<T> = (template: TemplateStringsArray, ...values: any[]) => T;
type BoundTemplateFunction<T extends Element | ShadowRoot> = TemplateFunction<T>;
type WiredTemplateFunction = TemplateFunction<any>;

declare class Component<T = {}> {
  static for(context: object, identity?: any): Component;
  handleEvent(e: Event): void;
  html: WiredTemplateFunction;
  svg: WiredTemplateFunction;
  state: T;
  readonly defaultState: T;
  setState(state: Partial<T> | ((this: this, state: T) => Partial<T>), render?: boolean): this;
  dispatch(type: string, detail?: any): boolean;
}

declare function bind<T extends Element | ShadowRoot>(element: T): BoundTemplateFunction<T>;

declare function define(intent: string, callback: Function): void;

declare function wire(identity?: object | null, type?: 'html' | 'svg'): WiredTemplateFunction;
declare function wire(identity?: object | null, type_id?: string): WiredTemplateFunction;

declare const hyper: {
  Component: typeof Component;
  bind: typeof bind;
  define: typeof define;
  hyper: typeof hyper;
  wire: typeof wire;

  // hyper(null, 'html')`HTML`
  (identity: null | undefined, type?: 'html' | 'svg'): WiredTemplateFunction;

  // hyper('html')`HTML`
  (type: 'html' | 'svg'): WiredTemplateFunction;
  
  // hyper(element)`HTML`
  <T extends Element>(element: T): BoundTemplateFunction<T>;

  // hyper`HTML`
  (template: TemplateStringsArray, ...values: any[]): any;

  // hyper(obj, 'html:id')`HTML`
  // hyper(obj)`HTML`
  (identity: object, type?: 'html' | 'svg'): WiredTemplateFunction;
  (identity: object, type_id?: string): WiredTemplateFunction;

  // hyper()`HTML`
  (): WiredTemplateFunction;
};
