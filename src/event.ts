export default class Event {
    
    events: object;

    constructor() {
        this.events = {};
    }

    emit(name, ...params) {
        const curEvent = this.events[name];
        if (curEvent?.length) {
            curEvent.forEach(fn => fn(...params));
        }
    }

    on(name, fn) {
        this.events[name] = this.events[name] || [];
        this.events[name].push(fn);
    }

    off(name, fn) {
        const curEvent = this.events[name];
        if (curEvent) {
            const index = curEvent.findIndex(fn);
            curEvent.splice(index, 1);
        }
    }

    clear(name) {
        this.events[name] = undefined;
    }

    clearAll() {
        this.events = {};
    }
}
