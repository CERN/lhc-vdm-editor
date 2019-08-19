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
        this._render_timeout = undefined;
        this._properties = {};

        if (typeof args[0] === "string") {
            this._properties = args[0];

            args.forEach(propertyName => {
                Object.defineProperty(this, propertyName, {
                    set: value => {
                        this._properties[propertyName] = value;
                        this.render()
                    },
                    get: () => this._properties[propertyName]
                })
            })
        }
        else if (args.length == 1) {
            this._properties = args[0];

            Object.keys(args[0]).forEach(propertyName => {
                Object.defineProperty(this, propertyName, {
                    set: value => {
                        this._properties[propertyName] = value;
                        this.render();
                    },
                    get: () => this._properties[propertyName]
                })
            })
        }
    }

    /**
     * Sets the state of an element and at some time calls the render function. NOTE: the render function
     * is called with other renders at a timeout of 0, to make sure that the render is called fewer times.
     * @param {object} props
     */
    setState(props) {
        for (let [key, value] of Object.entries(props)) {
            this[key] = value;
        }

        this.render();
    }

    set properties(props) {
        this.setState(props);
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
