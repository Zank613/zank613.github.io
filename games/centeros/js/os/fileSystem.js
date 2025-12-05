export class VirtualFile {
    constructor(name, content, type = "text") {
        this.id = "file_" + Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.content = content;

        // Types: "text", "image", "log", "enc", "bin"
        this.type = type;

        // Metadata
        this.size = Math.floor(Math.random() * 2048) + 128; // Size in Bytes
        this.createdAt = Date.now();

        // Encryption Logic
        this.isEncrypted = false;
        this.encryptionKey = null; // The password/key required to decrypt
        this.originalType = type;

        // Virus Logic
        this.isVirus = false;
        this.virusType = null;
        this.virusActive = false;
    }

    encrypt(key) {
        this.isEncrypted = true;
        this.encryptionKey = key;

        this.originalType = this.type;
        this.type = "enc";

        // Scramble content preview
        this.content = "ENCRYPTED_DATA_BLOB_" + Math.random().toString(16).toUpperCase();
    }

    attemptDecrypt(key) {
        if (!this.isEncrypted) {
            return { success: true, message: "File is not encrypted." };
        }

        if (key === this.encryptionKey) {
            this.isEncrypted = false;
            this.encryptionKey = null;
            this.type = this.originalType; // Restore original icon/type
            return { success: true, message: "Decryption successful." };
        }

        return { success: false, message: "Invalid decryption key." };
    }
}

// Represents a directory that can hold files or other folders
export class VirtualFolder {
    constructor(name, parent = null) {
        this.id = "folder_" + Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.type = "folder";
        this.children = []; // Array of VirtualFile
        this.parent = parent;
        this.createdAt = Date.now();
    }

    // Add a new file to this folder
    addFile(name, content, type = "text") {
        const file = new VirtualFile(name, content, type);
        this.children.push(file);
        return file;
    }

    // Add a sub-folder
    addFolder(name) {
        const folder = new VirtualFolder(name, this);
        this.children.push(folder);
        return folder;
    }

    // Move an existing file object into this folder
    ingest(node) {
        // Remove from old parent if exists
        if (node.parent && node.parent.children) {
            node.parent.children = node.parent.children.filter(c => c.id !== node.id);
        }
        // Add to this
        this.children.push(node);
    }

    deleteChild(id) {
        this.children = this.children.filter(c => c.id !== id);
    }

    find(name) {
        return this.children.find(c => c.name === name) || null;
    }

    // Returns full path string
    getPath() {
        if (!this.parent) return "/" + this.name;
        // Recursive path building
        return (this.parent.name === "root" ? "" : this.parent.getPath()) + "/" + this.name;
    }
}

// The class that manages the whole tree
export class FileSystem {
    constructor() {
        this.root = new VirtualFolder("root");

        // Default structure
        this.sys = this.root.addFolder("sys");
        this.home = this.root.addFolder("home");

        // User folders
        this.documents = this.home.addFolder("documents");
        this.downloads = this.home.addFolder("downloads");
        this.desktop = this.home.addFolder("desktop");
        this.cases = this.home.addFolder("cases");
    }

    // Helper to get a folder by simple path array
    getFolderByPath(pathArray) {
        let current = this.root;
        for (const name of pathArray) {
            const next = current.children.find(c => c.type === "folder" && c.name === name);
            if (!next) return null;
            current = next;
        }
        return current;
    }
}

// Export a single global instance
export const fs = new FileSystem();