export class AppRegistry {
    constructor() {
        this.definitions = new Map();
    }

    /**
     * Registers an app definition.
     * @param {string} id - unique app ID (e.g. "nethacker")
     * @param {Object} def - { title, preferredSize, createInstance: fn, fileExtensions: [] }
     */
    register(id, def) {
        this.definitions.set(id, { ...def, id });
    }

    get(id) {
        return this.definitions.get(id) || null;
    }

    /**
     * Finds which app ID is registered to handle a specific file extension.
     */
    getAppIdForExtension(ext) {
        if (!ext) return null;
        const cleanExt = ext.toLowerCase().replace(".", "");

        for (const [id, def] of this.definitions) {
            if (def.fileExtensions && Array.isArray(def.fileExtensions)) {
                if (def.fileExtensions.includes(cleanExt)) {
                    return id;
                }
            }
        }
        return null;
    }
}

export const appRegistry = new AppRegistry();