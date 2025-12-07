export class AppRegistry {
    constructor() {
        this.definitions = new Map();
    }

    /**
     * Registers an app definition.
     * @param {string} id - unique app ID (e.g. "nethacker")
     * @param {Object} def - { title, preferredSize, createInstance: fn }
     */
    register(id, def) {
        this.definitions.set(id, { ...def, id });
    }

    get(id) {
        return this.definitions.get(id) || null;
    }
}

export const appRegistry = new AppRegistry();