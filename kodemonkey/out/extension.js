"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const openai_1 = __importDefault(require("openai"));
let webviewViewGlobal;
let chatHistory = []; // all message ever
// custom terminal output channel
let kodemonkey = vscode.window.createOutputChannel("kodemonkey");
const openai = new openai_1.default({
    apiKey: "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",
});
// base function with which file creation is based upon
async function createFileBaseFunction(filePath = "testcreatefile/testfile.txt", content) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const workspacePath = workspaceFolders[0].uri; // Get the path of the first workspace folder
        const newFilePath = vscode.Uri.joinPath(workspacePath, filePath); // Create a new Uri for the new file
        const newFileDir = vscode.Uri.joinPath(workspacePath, path.dirname(filePath)); // Get the directory of the new file
        await vscode.workspace.fs.createDirectory(newFileDir); // Create the directory if it does not exist
        const newFileData = Buffer.from(content, "utf8"); // Create a buffer for the file content
        await vscode.workspace.fs.writeFile(newFilePath, newFileData); // Write the file
    }
    else {
        vscode.window.showErrorMessage("No workspace folder found. Please open a workspace first.");
    }
}
// creates file with empty contents
async function createFile(filePath = "testcreatefile/testfile.txt", content) {
    createFileBaseFunction(filePath, content);
}
// overwrites existing file with content
async function modifyFile(filePath = "testcreatefile/testfile.txt", content) {
    createFileBaseFunction(filePath, content);
}
function replaceLine(newText, linenum) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const line = editor.document.lineAt(linenum - 1);
        editor.edit((editBuilder) => {
            editBuilder.replace(line.range, newText); // Replace the line with the new text
        });
        vscode.commands.executeCommand("editor.action.formatDocument");
    }
}
function insertText(text) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const position = editor.selection.active;
        editor.edit((editBuilder) => {
            editBuilder.insert(position, text);
        });
    }
}
async function getLinesWithNumbers() {
    const editor = vscode.window.activeTextEditor;
    let textWithLineNumbers = "";
    if (editor) {
        const document = editor.document;
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            textWithLineNumbers += i + 1 + ": " + line.text + "\n"; // prepend line number
        }
    }
    return textWithLineNumbers;
}
function executeCommandLines(actions) {
    // Join the commands together with &&
    const command = actions.join(' && ');
    // Execute the command
    executeCommandLine(command);
}
async function executeCommandLine(action) {
    const { path, contents } = action;
    // Create a terminal if it doesn't exist
    const terminal = vscode.window.createTerminal();
    // Change to the specified directory
    terminal.sendText(`cd ${path}`);
    // Execute the command
    terminal.sendText(contents);
}
async function parseGPTOutput(jsonObject) {
    jsonObject = jsonObject.replace(/```json|```/g, "");
    try {
        // Try to parse the JSON string to an object
        jsonObject = JSON.parse(jsonObject);
    }
    catch (error) {
        // If an error is thrown, log it and return
        kodemonkey.appendLine("Invalid JSON:");
        kodemonkey.appendLine(jsonObject);
        return;
    }
    if (jsonObject["request_for_clarification"] && webviewViewGlobal) {
        // Assuming `panel` is your WebViewPanel
        webviewViewGlobal.webview.postMessage({
            type: "clarification",
            text: jsonObject["request_for_clarification"]["question"],
        });
        return;
    }
    for (let func of jsonObject["actions"]) {
        // Ensure func["path"] ends with a forward slash
        if (!func["path"].endsWith("/")) {
            func["path"] += "/";
        }
        if (func["action"] === "createFolder") {
            kodemonkey.appendLine(`Creating folder at path: ${func["path"] + func["name"]}...`);
            createFile(func["path"] + func["name"], "");
        }
        else if (func["action"] === "createFile") {
            kodemonkey.appendLine(`Creating file at path: ${func["path"] + func["name"]} with contents: ${func["contents"]}...`);
            createFile(func["path"] + func["name"], func["contents"]);
        }
        else if (func["action"] === "modifyFile") {
            kodemonkey.appendLine(`Overwriting file at path: ${func["path"] + func["name"]} with contents: ${func["contents"]}...`);
            modifyFile(func["path"] + func["name"], func["contents"]);
        }
        else if (func["action"] === "executeCommandLine") {
            kodemonkey.appendLine(`Executing command line at path: ${func["path"]} with contents: ${func["contents"]}...`);
        }
    }
}
async function chat(userInput) {
    kodemonkey.appendLine("chatting with kodemonkey...");
    // const contents = fs.readFileSync(path.join(__dirname, 'prompt.txt'), 'utf8');
    // kodemonkey.appendLine("pROMT IS " + contents);
    const prompt = `You are an advanced code analysis and action recommendation engine designed to process user inputs regarding software project development. Your capabilities are centered around interpreting project requirements and translating these into specific actions using a predefined API, which includes creating files and folders, modifying file contents, and executing command lines. our interactions are strictly limited to two types of JSON responses: 1) A JSON response containing API function calls for project actions when user inputs are clear and actionable. 2) A JSON response that includes a request for further clarification structured explicitly in JSON format, to ensure compatibility with the software"s processing logic. It is crucial that all responses, without exception, are provided in JSON format to maintain system integrity and ensure automated processing by the software. Under no circumstances should responses deviate from this JSON format, as doing so could disrupt the software"s ability to recognize and execute the provided instructions.

  - **Mandatory JSON Format for Clarification Requests**: In instances where the user's input lacks clarity or specificity, and further information is needed to proceed, your response must be in JSON format, explicitly stating the need for clarification. For example:{
	  "request_for_clarification": {
		  "question": "Could you specify the technology stack or framework you are using, and any particular file structure preferences for implementing the requested feature?"
	  }
  }
  
  - **JSON Response with API Calls Example**: When instructions are clear and actionable, your response detailing the necessary API function calls should also strictly follow the JSON format, like in this example for creating a specific file structure for a Flask app: {
	  "actions": [
		  {
			  "action": "createFolder",
			  "path": "./",
			  "name": "project_name"
		  },
		  {
			  "action": "createFile",
			  "path": "./project_name",
			  "name": "main.py",
			  "contents": "# Flask app initialization code here"
		  },
		  {
			  "action": "modifyFile",
			  "path": "./project_name",
			  "name": "requirements.txt",
			  "contents": "Flask\n"
		  },
		  {
			  "action": "executeCommandLine",
			  "path": "./project_name",
			  "contents": "pip install -r requirements.txt"
		  }
	  ]
  }
  
  This explicit emphasis on JSON-only responses is designed to safeguard against any potential misunderstandings or misinterpretations by ensuring that every interaction with the LLM, including requests for additional information, adheres to a structured and programmatically processable format. Your goal is to seamlessly translate user inputs into a structured set of actions that the software can execute to advance the project development, pivoting between generating actionable tasks and seeking further details as necessary. This approach ensures a direct, efficient pathway from project conception to execution, underpinned by precise, actionable, and executable guidance.`;
    chatHistory.push({ role: "user", content: userInput });
    //   kodemonkey.appendLine(prompt);
    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: "system",
                content: prompt,
            },
            ...chatHistory,
        ],
        model: "gpt-4",
    });
    const gptOutput = completion.choices[0].message.content;
    if (gptOutput) {
        // prints GPT output to custom output
        kodemonkey.appendLine("GPT OUTPUT: " + gptOutput);
        chatHistory.push({ role: "assistant", content: gptOutput });
        // kodemonkey.appendLine(JSON.stringify(chatHistory));
        // parse response as JSON
        parseGPTOutput(gptOutput);
        // eval(completion.choices[0].message.content); // RUNS THE CODE
        // replaceLine(completion.choices[0].message.content, 0);
    }
    return completion.choices[0].message.content;
}
function activate(context) {
    const provider = new ColorsViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(ColorsViewProvider.viewType, provider));
    context.subscriptions.push(vscode.commands.registerCommand("kodemonkey.insertMultiLine", () => {
        // Parameters: lineNum (number of line to begin insertion), textToInsert (code with newlines in between, must have correct indentation)
        const editor = vscode.window.activeTextEditor;
        const textToInsert = "const a = 1;\nconst b = 2;\nconst c = 3;\n";
        const lineNum = 2; // 0-based index, so line 2 is the third line
        if (editor) {
            const position = new vscode.Position(lineNum, 0);
            editor.edit((editBuilder) => {
                editBuilder.insert(position, textToInsert);
            });
        }
    }));
    // replaces multi lines of code with multiple lines of code (not necessary same number)
    context.subscriptions.push(vscode.commands.registerCommand("kodemonkey.replaceMultiLine", () => {
        // parameters: textToInsert(String with newlines to replace old code with), lineStartReplace (number of line to begin replacement), lineEndReplace (number of line to end replacement)
        const editor = vscode.window.activeTextEditor;
        const lineStartReplace = 0;
        const lineEndReplace = 1;
        const textToInsert = "let a = 1;\nlet b = 2;\nlet c = 3;";
        if (editor) {
            const start = new vscode.Position(lineStartReplace, 0); // Line 1, character 0
            const end = new vscode.Position(lineEndReplace, editor.document.lineAt(lineEndReplace).text.length); // Line 2, end of line
            const range = new vscode.Range(start, end);
            editor.edit((editBuilder) => {
                editBuilder.replace(range, textToInsert);
            });
        }
    }));
    // create a file and insert content into that file
    context.subscriptions.push(vscode.commands.registerCommand("kodemonkey.createNewFile", () => {
        // parameters: filePath (relative path to file from workspace root), content (content to insert into file)
        createFile("testcreatefile/testfile.txt", "Hello, world!");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("kodemonkey.modifyFile", () => {
        modifyFile("testcreatefile/testfile.txt", "Overwritten!!");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("kodemonkey.runCommandInTerminal", () => {
        const terminal = vscode.window.createTerminal(`Ext Terminal #${Math.random()}`);
        terminal.sendText("npx create-react-app my-app && cd my-app && npm start");
        terminal.show();
    }));
}
exports.activate = activate;
class ColorsViewProvider {
    _extensionUri;
    static viewType = "kodemonkey.colorsView";
    _view;
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        webviewViewGlobal = webviewView;
        this._view = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case "submit": {
                    const response = await chat(data.text);
                    if (response) {
                        webviewView.webview.postMessage({
                            type: "chatResult",
                            text: "kodemonkey: " + response,
                        });
                        kodemonkey.appendLine("chat sent :)");
                    }
                    break;
                }
                case "clear":
                    chatHistory = [];
                    break;
            }
        });
    }
    _getHtmlForWebview(webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.js"));
        // Do the same for the stylesheet.
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css"));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.css"));
        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">

                <!--
                    Use a content security policy to only allow loading styles from our extension directory,
                    and only allow scripts that have a specific nonce.
                    (See the 'webview-sample' extension sample for img-src content security policy examples)
                -->
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

                <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${styleMainUri}" rel="stylesheet">

                <title>Input Panel</title>
            </head>

            <body>
			<p>Start your chat here!</p>
				<form id="myForm">
				<input type="text" class="user-input" placeholder="What's your question">
                <button type="submit" class="submit-button">ask kodemonkey</button>
				</form>
				<button class="clear-button">restart from scratch</button>


				<script nonce="${nonce}" src="${scriptUri}">

				</script>
			</body>
            </html>`;
    }
}
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=extension.js.map