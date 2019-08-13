/** @type {any} */
export let MyHyperHTMLElement = class extends HTMLElement{
    constructor(...args){
        super()
        this._properties = {};

        args.forEach(propertyName => {
            Object.defineProperty(this, propertyName, {
                set: value => {this._properties[propertyName] = value; this.render()},
                get: () => this._properties[propertyName]
            })
        })
    }

    set properties(props){
        for(let [key, value] of Object.entries(props)){
            this[key] = value;
        }
    }
    
    handleEvent(event){
        // @ts-ignore
        this[event.currentTarget.name] = event.currentTarget.value;
        this.render();
    }

    connectedCallback(){
        this.render();
    }

    render(){
        // define non-empty renderer on components extending this one
    }
}