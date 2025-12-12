import { state } from "../state.js";
import { networkManager } from "../os/networkManager.js";
import { fs } from "../os/fileSystem.js";

export class ScriptSystem {
    static execute(file) {
        if (!file || !file.content) return { success: false, message: "Corrupted file." };

        let bytecode = [];
        try {
            const data = JSON.parse(file.content);
            if (data.sig === "CENTER_EXE") bytecode = data.bytecode;
            else throw new Error("Invalid Sig");
        } catch (e) {
            return { success: false, message: "Invalid Executable Format." };
        }

        const vm = new VM(bytecode);
        return vm.run();
    }
}

class VM {
    constructor(bytecode) {
        this.code = bytecode;
        this.ip = 0;
        this.stack = [];
        this.vars = {};
        this.output = [];
        this.cycles = 0;
        this.maxCycles = 5000;
    }

    run() {
        try {
            while (this.ip < this.code.length) {
                if (this.cycles++ > this.maxCycles) throw new Error("Stack Overflow / Infinite Loop Limit");

                const inst = this.code[this.ip];
                this.ip++;

                switch (inst.op) {
                    case "PUSH_NUM": this.stack.push(Number(inst.arg)); break;
                    case "PUSH_STR": this.stack.push(String(inst.arg)); break;
                    case "POP": this.stack.pop(); break;

                    case "STORE_VAR":
                        this.vars[inst.arg] = this.stack.pop();
                        break;

                    case "LOAD_VAR":
                        if (this.vars[inst.arg] === undefined) throw new Error(`Undefined variable: ${inst.arg}`);
                        this.stack.push(this.vars[inst.arg]);
                        break;

                    case "BIN_OP":
                        const b = this.stack.pop();
                        const a = this.stack.pop();
                        if (inst.arg === "+") this.stack.push(a + b);
                        else if (inst.arg === "-") this.stack.push(a - b);
                        else if (inst.arg === "*") this.stack.push(a * b);
                        else if (inst.arg === "/") this.stack.push(a / b);
                        else if (inst.arg === "==") this.stack.push(a === b);
                        else if (inst.arg === "!=") this.stack.push(a !== b);
                        else if (inst.arg === ">") this.stack.push(a > b);
                        else if (inst.arg === "<") this.stack.push(a < b);
                        break;

                    case "PRINT":
                        const val = this.stack.pop();
                        this.output.push(`>> ${val}`);
                        break;

                    case "JUMP":
                        this.ip = inst.arg;
                        break;

                    case "JUMP_IF_FALSE":
                        const condition = this.stack.pop();
                        if (!condition) this.ip = inst.arg;
                        break;

                    case "CALL":
                        this.handleSysCall(inst.arg);
                        break;
                }
            }
        } catch (e) {
            return { success: false, message: `Runtime Error: ${e.message}` };
        }

        return { success: true, message: this.output.join("\n") };
    }

    handleSysCall(funcName) {
        // --- INPUT / OUTPUT ---

        if (funcName === "Console.input") {
            const promptText = this.stack.pop();
            // Pauses the entire OS to get input
            const result = prompt(promptText || "Input required:");
            this.stack.push(result || "");
        }

        // --- MATH API ---

        else if (funcName === "Math.random") {
            this.stack.push(Math.random());
        }
        else if (funcName === "Math.floor") {
            const val = this.stack.pop();
            this.stack.push(Math.floor(val));
        }
        else if (funcName === "Math.round") {
            const val = this.stack.pop();
            this.stack.push(Math.round(val));
        }

        // --- STRING API ---

        else if (funcName === "String.length") {
            const str = String(this.stack.pop());
            this.stack.push(str.length);
        }

        // --- SYSTEM / OS ---

        else if (funcName === "App.launch") {
            const id = this.stack.pop();
            window.dispatchEvent(new CustomEvent("force-open-app", { detail: { id } }));
            this.output.push(`[SYS] Launched ${id}`);
            this.stack.push(true);
        }
        else if (funcName === "Sys.getHeat") {
            this.stack.push(state.policeHeat);
        }
        else if (funcName === "Sys.time") {
            this.stack.push(state.time.minutes); // In-game minutes
        }

        // --- NETWORK ---

        else if (funcName === "Net.connect") {
            const ssid = this.stack.pop();
            const net = networkManager.getNetworkBySsid(ssid);
            if (net) {
                networkManager.connect(net.id);
                this.output.push(`[NET] Connected to ${ssid}`);
                this.stack.push(true);
            } else {
                this.output.push(`[NET] Failed to find ${ssid}`);
                this.stack.push(false);
            }
        }
        else if (funcName === "Net.scan") {
            const list = networkManager.networks.map(n => n.ssid).join(",");
            this.stack.push(list);
        }

        // --- FILESYSTEM ---

        else if (funcName === "File.read") {
            const name = this.stack.pop();
            const file = fs.documents.find(name) || fs.desktop.find(name);
            if (file) this.stack.push(file.content);
            else this.stack.push("");
        }
        else if (funcName === "File.write") {
            const content = this.stack.pop();
            const name = this.stack.pop();
            fs.documents.addFile(name, String(content), "text");
            this.output.push(`[FS] Wrote to ${name}`);
            this.stack.push(true);
        }
        else if (funcName === "File.exists") {
            const name = this.stack.pop();
            const exists = !!(fs.documents.find(name) || fs.desktop.find(name));
            this.stack.push(exists);
        }
        else {
            throw new Error(`Unknown function: ${funcName}`);
        }
    }
}