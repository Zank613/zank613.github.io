export class VirtualFile {
    constructor(name, content, type = "text") {
        this.id = "file_" + Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.content = content;
        this.type = type; // text, image, binary, encrypted

        this.extension = name.includes(".") ? name.split(".").pop() : "txt";

        // Metadata
        this.size = Math.floor(Math.random() * 2048) + 128;
        this.createdAt = Date.now();

        // Security / Lore Flags
        this.isEncrypted = (this.extension === "ces");
        this.isMalicious = false;
        this.isTracked = (this.extension === "ccts");
    }

    // Renames the file and updates extension/flags automatically
    rename(newName) {
        this.name = newName;
        this.extension = newName.includes(".") ? newName.split(".").pop() : "txt";
        if(this.extension === "ces") this.isEncrypted = true;
        if(this.extension === "cts") this.isEncrypted = false;
        if(this.extension === "ccts") this.isTracked = true;
    }
}

export class VirtualFolder {
    constructor(name, parent = null) {
        this.id = "folder_" + Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.type = "folder";
        this.children = [];
        this.parent = parent;
        this.createdAt = Date.now();
    }

    addFile(name, content, type = "text") {
        const file = new VirtualFile(name, content, type);
        // Default some lore files to be malicious for testing
        if (name.includes("exploit") || name.includes("virus")) file.isMalicious = true;
        this.children.push(file);
        return file;
    }

    addFolder(name) {
        const folder = new VirtualFolder(name, this);
        this.children.push(folder);
        return folder;
    }

    ingest(node) {
        if (node.parent && node.parent.children) {
            node.parent.children = node.parent.children.filter(c => c.id !== node.id);
        }
        node.parent = this;
        this.children.push(node);
    }

    deleteChild(id) {
        this.children = this.children.filter(c => c.id !== id);
    }

    find(name) {
        return this.children.find(c => c.name === name) || null;
    }

    // Helper to get all files recursively
    getAllFiles() {
        let files = [];
        for(const child of this.children) {
            if(child.type === "folder") files = files.concat(child.getAllFiles());
            else files.push(child);
        }
        return files;
    }

    getPath() {
        if (!this.parent) return "/" + this.name;
        return (this.parent.name === "root" ? "" : this.parent.getPath()) + "/" + this.name;
    }
}

export class FileSystem {
    constructor() {
        this.root = new VirtualFolder("root");
        this.sys = this.root.addFolder("sys");
        this.home = this.root.addFolder("home");
        this.documents = this.home.addFolder("documents");
        this.downloads = this.home.addFolder("downloads");
        this.desktop = this.home.addFolder("desktop");
        this.cases = this.home.addFolder("cases");
    }
}

export const fs = new FileSystem();