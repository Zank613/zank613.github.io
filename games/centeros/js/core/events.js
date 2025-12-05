export class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(type, handler) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(handler);
        return () => this.off(type, handler);
    }

    off(type, handler) {
        const set = this.listeners.get(type);
        if (!set) return;
        set.delete(handler);
    }

    emit(type, payload) {
        const set = this.listeners.get(type);
        if (!set) return;
        for (const handler of set) {
            handler(payload);
        }
    }
}
