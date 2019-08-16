/**
 * @type {{
 *  new(...args: any): {
 *    [index: string]: any;
 *    properties: object;
 *  } & HTMLElement
 * }}
 */
export var MyHyperHTMLElement = class MyHyperHTMLElement extends HTMLElement {
    constructor(...args) {
        super();
        this.dontRender = false;

        if (typeof args[0] === "string") {
            this._properties = {};

            args.forEach(propertyName => {
                Object.defineProperty(this, propertyName, {
                    set: value => { this._properties[propertyName] = value; this.dontRender || this.render() },
                    get: () => this._properties[propertyName]
                })
            })
        }
        else if (args.length == 1) {
            this._properties = args[0];

            Object.keys(args[0]).forEach(propertyName => {
                Object.defineProperty(this, propertyName, {
                    set: value => { this._properties[propertyName] = value; this.dontRender || this.render() },
                    get: () => this._properties[propertyName]
                })
            })
        }
    }

    set properties(props) {
        this.dontRender = true;
        for (let [key, value] of Object.entries(props)) {
            this[key] = value;
        }
        this.dontRender = false;
        this.render();
    }

    handleEvent(event) {
        // @ts-ignore
        this[event.target.name] = event.target.value;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        // define non-empty renderer on components extending this one
    }
}
