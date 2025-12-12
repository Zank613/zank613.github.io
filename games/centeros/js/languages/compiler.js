export class Compiler {
    static compile(sourceCode) {
        const tokens = this.tokenize(sourceCode);
        const parser = new Parser(tokens);
        try {
            const bytecode = parser.parse();
            return { success: true, bytecode: bytecode };
        } catch (e) {
            return { success: false, errors: [e.message] };
        }
    }

    static tokenize(source) {
        const tokens = [];
        let cursor = 0;

        const KEYWORDS = { "var": "VAR", "if": "IF", "else": "ELSE", "while": "WHILE", "print": "PRINT" };

        while (cursor < source.length) {
            let char = source[cursor];

            if (/\s/.test(char)) { cursor++; continue; }

            if (char === '/' && source[cursor+1] === '/') {
                while (cursor < source.length && source[cursor] !== '\n') cursor++;
                continue;
            }

            if (/[0-9]/.test(char)) {
                let num = "";
                while (cursor < source.length && /[0-9.]/.test(source[cursor])) {
                    num += source[cursor++];
                }
                tokens.push({ type: "NUMBER", value: parseFloat(num) });
                continue;
            }

            if (char === '"') {
                let str = "";
                cursor++;
                while (cursor < source.length && source[cursor] !== '"') {
                    str += source[cursor++];
                }
                cursor++;
                tokens.push({ type: "STRING", value: str });
                continue;
            }

            if (/[a-zA-Z_]/.test(char)) {
                let word = "";
                while (cursor < source.length && /[a-zA-Z0-9_.]/.test(source[cursor])) {
                    word += source[cursor++];
                }
                if (KEYWORDS[word]) tokens.push({ type: KEYWORDS[word], value: word });
                else tokens.push({ type: "IDENTIFIER", value: word });
                continue;
            }

            const twoChar = source.substr(cursor, 2);
            if (["==", ">=", "<=", "!="].includes(twoChar)) {
                tokens.push({ type: "OPERATOR", value: twoChar });
                cursor += 2;
                continue;
            }

            if (/[+\-*/=<>(){};]/.test(char)) {
                tokens.push({ type: "PUNCTUATION", value: char });
                cursor++;
                continue;
            }

            cursor++;
        }
        return tokens;
    }
}

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.instructions = [];
    }

    peek() { return this.tokens[this.pos]; }
    consume() { return this.tokens[this.pos++]; }
    match(type, value = null) {
        const t = this.peek();
        if (t && t.type === type && (!value || t.value === value)) {
            this.pos++;
            return true;
        }
        return false;
    }
    expect(type, value = null) {
        if (!this.match(type, value)) throw new Error(`Expected ${type} ${value || ""} at token ${this.pos}`);
    }

    emit(op, arg = null) { this.instructions.push({ op, arg }); }

    parse() {
        while (this.pos < this.tokens.length) {
            this.statement();
        }
        return this.instructions;
    }

    statement() {
        const t = this.peek();
        if (this.match("VAR")) {
            this.varDeclaration();
        } else if (this.match("IF")) {
            this.ifStatement();
        } else if (this.match("WHILE")) {
            this.whileStatement();
        } else if (this.match("PRINT")) {
            this.printStatement();
        } else if (t && t.type === "IDENTIFIER") {
            if (this.tokens[this.pos + 1] && this.tokens[this.pos + 1].value === "=") {
                this.assignment();
            } else {
                this.expression();
                this.match("PUNCTUATION", ";");
                this.emit("POP");
            }
        } else {
            this.pos++;
        }
    }

    varDeclaration() {
        const name = this.consume().value;
        this.expect("PUNCTUATION", "=");
        this.expression();
        this.emit("STORE_VAR", name);
        this.match("PUNCTUATION", ";");
    }

    assignment() {
        const name = this.consume().value;
        this.expect("PUNCTUATION", "=");
        this.expression();
        this.emit("STORE_VAR", name);
        this.match("PUNCTUATION", ";");
    }

    printStatement() {
        this.expect("PUNCTUATION", "(");
        this.expression();
        this.expect("PUNCTUATION", ")");
        this.emit("PRINT");
        this.match("PUNCTUATION", ";");
    }

    ifStatement() {
        this.expect("PUNCTUATION", "(");
        this.expression();
        this.expect("PUNCTUATION", ")");

        const jumpFalseIndex = this.instructions.length;
        this.emit("JUMP_IF_FALSE", 0);

        this.expect("PUNCTUATION", "{");
        while (!this.match("PUNCTUATION", "}")) {
            this.statement();
        }

        this.instructions[jumpFalseIndex].arg = this.instructions.length;

        if (this.match("ELSE")) {
            const jumpEndIndex = this.instructions.length;
            this.emit("JUMP", 0);
            this.instructions[jumpFalseIndex].arg = this.instructions.length;

            this.expect("PUNCTUATION", "{");
            while (!this.match("PUNCTUATION", "}")) {
                this.statement();
            }
            this.instructions[jumpEndIndex].arg = this.instructions.length;
        }
    }

    whileStatement() {
        const startIndex = this.instructions.length;
        this.expect("PUNCTUATION", "(");
        this.expression();
        this.expect("PUNCTUATION", ")");

        const jumpFalseIndex = this.instructions.length;
        this.emit("JUMP_IF_FALSE", 0);

        this.expect("PUNCTUATION", "{");
        while (!this.match("PUNCTUATION", "}")) {
            this.statement();
        }

        this.emit("JUMP", startIndex);
        this.instructions[jumpFalseIndex].arg = this.instructions.length;
    }

    expression() {
        this.term();
        while (this.peek() && ["+", "-", "*", "/", "==", ">", "<", ">=", "<=", "!="].includes(this.peek().value)) {
            const op = this.consume().value;
            this.term();
            this.emit("BIN_OP", op);
        }
    }

    term() {
        const t = this.peek();

        if (t && t.type === "PUNCTUATION" && t.value === "-") {
            this.consume(); // Eat '-'
            const next = this.consume(); // Eat number
            if (next && next.type === "NUMBER") {
                this.emit("PUSH_NUM", -next.value);
            } else {
                throw new Error("Unary minus only supported for numbers");
            }
            return;
        }

        this.consume(); // Eat current token

        if (t.type === "NUMBER") this.emit("PUSH_NUM", t.value);
        else if (t.type === "STRING") this.emit("PUSH_STR", t.value);
        else if (t.type === "IDENTIFIER") {
            if (this.match("PUNCTUATION", "(")) {
                if (!this.match("PUNCTUATION", ")")) {
                    this.expression();
                    while (this.match("PUNCTUATION", ",")) {
                        this.expression();
                    }
                    this.expect("PUNCTUATION", ")");
                }
                this.emit("CALL", t.value);
            } else {
                this.emit("LOAD_VAR", t.value);
            }
        }
        else if (t.value === "(") {
            this.expression();
            this.expect("PUNCTUATION", ")");
        }
    }
}