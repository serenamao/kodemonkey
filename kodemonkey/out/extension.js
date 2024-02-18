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
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const process = __importStar(require("process"));
const child_process = __importStar(require("child_process"));
let webviewViewGlobal;
const agentPrompt = "You are a product manager telling me how to code a requested app. If the app has a User Interface, the last two steps should be to 1) make the app pretty and 2) run it at the end! In each response, give me the description of a single step I should implement. I will respond with my intended changes to the code. Only say 2 sentences at a time. Do not let me get away with submitting incomplete code with a descriptive comment. If I do, please remind me that I need to write the full and complete code.";
const kodemonkeyPrompt = `You are an advanced code analysis and action recommendation engine with a critical operational mandate: All interactions, including providing recommendations for software project development actions and requests for further clarification from the user, must exclusively use a strict JSON response format. This non-negotiable requirement is in place to ensure seamless integration with an automated software development system, which relies on precise JSON-formatted instructions to create files and folders, modify file contents, and execute command lines. 

Failure to adhere to this JSON-only format will disrupt the automated processing capabilities of the software, potentially leading to system failures or incorrect actions being taken. Therefore, it is imperative that your outputs are meticulously structured in JSON, reflecting either direct action commands using a predefined API or structured requests for additional information when inputs are ambiguous or incomplete.

Your responses will fall into two categories, each requiring a JSON format:

1. **Actionable Instructions**: When user inputs are clear, provide a JSON response detailing the specific API function calls needed. For example, creating a file or executing a command line. It's crucial to differentiate between commands that should halt subsequent actions until completion (executeCommandLineBlocking) and those that allow the system to continue running other commands simultaneously (executeCommandLineNonBlocking).

2. **Clarification Requests**: In cases where the user's input requires further detail to proceed, your response must also be in JSON, clearly specifying the information needed. This ensures the software remains in a ready state to process and execute commands once clarifications are provided.

By strictly adhering to this JSON-only protocol, you play a vital role in maintaining the operational integrity of the software development system, ensuring that all project development actions are executed accurately and efficiently based on user inputs. Below are examples illustrating how to structure both types of responses:

**Actionable Instructions Example**:
{
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
            "contents": "from flask import Flask\\n\\napp = Flask(__name__)\\n\\n@app.route('/')\\ndef home():\\n    return 'Hello, World!'\\n\\nif __name__ == '__main__':\\n    app.run(debug=True)"
        },
        {
            "action": "modifyFile",
            "path": "./project_name",
            "name": "requirements.txt",
            "contents": "Flask"
        },
        {
            "action": "executeCommandLineBlocking",
            "path": "./project_name",
            "contents": "pip install -r requirements.txt"
        },
        {
            "action": "executeCommandLineNonBlocking",
            "path": "./project_name",
            "contents": "python app.py"
        }
    ]
}

**Clarification Request Example**:
{
    "request_for_clarification": {
        "question": "Please specify the technology stack or framework you are using, including any particular preferences for file structure or initial setup requirements."
    }
}
For each action, ALWAYS include a path, and always use "contents".
Remember, the effectiveness of this system relies on your precision and adherence to the JSON-only response format for both executing project development actions and engaging with the user for clarifications. Your strict compliance with this format is crucial for the software's ability to understand and act upon your recommendations.`;
//  message history
let kodemonkeyChatHistory = [];
let pmChatHistory = [];
// custom terminal output channel
// actual user output
let kodemonkey = vscode.window.createOutputChannel("kodemonkey");
// debug logs
let kodemonkey_logs = vscode.window.createOutputChannel("kodemonkey_logs");
const openai = new openai_1.default({
    apiKey: "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",
});
async function createFolder(folderPath = "testcreatefolder") {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const workspacePath = workspaceFolders[0].uri; // Get the path of the first workspace folder
        const newFolderPath = vscode.Uri.joinPath(workspacePath, folderPath); // Create a new Uri for the new folder
        await vscode.workspace.fs.createDirectory(newFolderPath); // Create the directory if it does not exist
    }
    else {
        vscode.window.showErrorMessage("No workspace folder found. Please open a workspace first.");
    }
}
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
    await createFileBaseFunction(filePath, content);
}
// overwrites existing file with content
async function modifyFile(filePath = "testcreatefile/testfile.txt", content) {
    await createFileBaseFunction(filePath, content);
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
async function executeCommandLineNonBlocking(action) {
    const { path, contents } = action;
    const terminal = vscode.window.createTerminal();
    // Change to the specified directory
    // Get the path of the workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspacePath = workspaceFolder?.uri.fsPath;
    if (workspacePath) {
        // Change to the workspace directory
        terminal.sendText(`cd "${workspacePath}"`);
    }
    else {
        console.error('No workspace folder found');
    }
    terminal.sendText(`cd ${path}`);
    // Execute the command and echo a message
    const doneMessage = "Command finished executing";
    terminal.sendText(`${contents}`);
    // Return a promise that resolves when the done message is printed
    return;
}
async function executeCommandLine(action) {
    const { path, contents } = action;
    kodemonkey_logs.appendLine(`Executing command: ${contents}`);
    kodemonkey_logs.appendLine(`Target directory (hardcoded): ${path}`);
    const executeCommand = (cmd, cwd) => {
        return new Promise((resolve, reject) => {
            // Log the intended directory before executing
            kodemonkey_logs.appendLine(`Preparing to execute in directory: ${cwd}`);
            const options = {
                cwd, // This ensures the command runs in the specified directory
                env: { ...process.env }
            };
            // For debugging: append a command to print the current working directory
            const debugCmd = `pwd && ${cmd}`;
            // Get the workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const workspacePath = workspaceFolder.uri.fsPath;
                // Get all files in the workspace
                const files = fs.readdirSync(workspacePath);
                kodemonkey_logs.appendLine(`Files in workspace: ${files.join(', ')}`);
            }
            else {
                kodemonkey_logs.appendLine(`No workspace folder found`);
            }
            // Test theory 1: Check if the directory exists
            if (!fs.existsSync(cwd)) {
                reject(`Directory does not exist: ${cwd}`);
            }
            // Test theory 2: Check if the shell executable exists
            child_process.exec('which sh', (error, stdout, stderr) => {
                if (error || stderr || !stdout) {
                    reject(`Shell executable does not exist or is not in PATH`);
                    return;
                }
            });
            (0, child_process_1.exec)(debugCmd, options, (error, stdout, stderr) => {
                if (error) {
                    reject(`error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    reject(`stderr: ${stderr}`);
                    return;
                }
                resolve(stdout);
            });
        });
    };
    try {
        const output = await executeCommand(contents, path);
        // This log will include the output of `pwd` command followed by your actual command's output
        kodemonkey_logs.appendLine(`Command execution output: ${output}`);
    }
    catch (error) {
        kodemonkey_logs.appendLine(`Error executing command: ${error}`);
    }
}
function extractStringBetweenBrackets(inputString) {
    const openBracketIndex = inputString.indexOf('{');
    const lastClosedBracketIndex = inputString.lastIndexOf('}');
    if (openBracketIndex !== -1 && lastClosedBracketIndex !== -1 && openBracketIndex < lastClosedBracketIndex) {
        return inputString.substring(openBracketIndex, lastClosedBracketIndex + 1);
    }
    else {
        return null; // Return null if no valid brackets are found
    }
}
async function parseGPTOutput(jsonObject) {
    jsonObject = jsonObject.replace(/```json|```/g, "");
    var jsonString = jsonObject;
    try {
        // Try to parse the JSON string to an object
        jsonObject = JSON.parse(jsonObject);
    }
    catch (error) {
        // If an error is thrown, log it and return
        kodemonkey_logs.appendLine("Invalid JSON:");
        kodemonkey_logs.appendLine(jsonObject);
        jsonString = extractStringBetweenBrackets(jsonString);
        if (jsonString) {
            kodemonkey_logs.appendLine("Extracted JSON:" + jsonString);
            // Create a new instance of the OpenAI LLM
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "Fix the following invalid JSON by outputting just json and nothing else" + jsonString,
                    },
                ],
            });
            // Extract the fixed JSON from the LLM output
            const fixedJsonString = completion.choices[0].message.content;
            kodemonkey_logs.appendLine("Fixed JSON:" + fixedJsonString);
        }
        else {
            kodemonkey_logs.appendLine("No valid JSON found");
            return;
        }
    }
    if (jsonObject["request_for_clarification"]) {
        // Assuming `panel` is your WebViewPanel
        if (webviewViewGlobal && jsonObject["request_for_clarification"]["question"]) {
            webviewViewGlobal.webview.postMessage({
                type: "clarification",
                text: jsonObject["request_for_clarification"]["question"],
            });
        }
        else {
            kodemonkey_logs.appendLine("Error: webview not found");
        }
        return;
    }
    // Create a new terminal with a random name
    const thisTerminal = vscode.window.createTerminal();
    for (let func of jsonObject["actions"]) {
        // Ensure func["path"] ends with a forward slash
        if (!func["path"]) {
            func["path"] = "./";
        }
        else if (func["path"] && !func["path"].endsWith("/")) {
            func["path"] += "/";
        }
        if (!func["contents"]) {
            func["contents"] = "";
        }
        if (func["action"] === "createFolder") {
            kodemonkey_logs.appendLine(`Creating folder at path: ${func["path"] + func["name"]}...`);
            await createFolder(func["path"] + func["name"]);
        }
        else if (func["action"] === "createFile") {
            kodemonkey_logs.appendLine(`Creating file at path: ${func["path"] + func["name"]} with contents: ${func["contents"]}...`);
            await createFile(func["path"] + func["name"], func["contents"]);
        }
        else if (func["action"] === "modifyFile") {
            kodemonkey_logs.appendLine(`Overwriting file at path: ${func["path"] + func["name"]} with contents: ${func["contents"]}...`);
            await modifyFile(func["path"] + func["name"], func["contents"]);
        }
        else if (func["action"] === "executeCommandLineBlocking" || func["action"] === "executeCommandLine") {
            kodemonkey_logs.appendLine(`block/nonblok Executing command line at path: ${func["path"]} with contents: ${func["contents"]}...`);
            // get concrete path
            const concretePath = func["path"].replace(".", vscode.workspace.workspaceFolders?.[0]?.uri.fsPath);
            kodemonkey_logs.appendLine(`Concrete path: ${concretePath}`);
            await executeCommandLine({ ...func, path: concretePath });
            kodemonkey_logs.appendLine(`GOODBYE...`);
        }
        else if (func["action"] === "executeCommandLineNonBlocking") {
            kodemonkey_logs.appendLine(`Executing command line at path: ${func["path"]} with contents: ${func["contents"]}...`);
            await executeCommandLineNonBlocking(func);
        }
    }
}
async function chatTwice(userPrompt) {
    // starting from scratch, both just have a system prompt
    // hardcode in a first statement from the PM to the AI
    // wait for the AI's completion, and then send the AI's completion to the PM. do this whole thing 5 times.
    kodemonkey_logs.appendLine("chatting twice with kodemonkey...");
    if (kodemonkeyChatHistory.length == 0) {
        // this is the first time we're chatting
        kodemonkeyChatHistory = [
            { role: "user", content: "Ask me two questions. First, what is a one line summary of your app? Second, what tools, technologies, or tech stack are you using? By the way, this is what I want:" + userPrompt }
        ];
    }
    else {
        // this is a follow up question
        kodemonkeyChatHistory.push({ role: "user", content: userPrompt });
        pmChatHistory.push({ role: "system", content: userPrompt });
    }
    // hard coded 10 back and forths
    for (let i = 0; i < 5; i++) {
        const completionKodemonkey = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: kodemonkeyPrompt,
                },
                ...kodemonkeyChatHistory,
            ],
            model: "gpt-4",
        });
        const gptOutput = completionKodemonkey.choices[0].message.content;
        if (gptOutput) {
            // prints GPT output to custom output
            kodemonkey_logs.appendLine("START KODEMONKEY GPT OUTPUT: " + gptOutput + ": END OUTPUT");
            kodemonkeyChatHistory.push({ role: "assistant", content: gptOutput });
            pmChatHistory.push({ role: "user", content: gptOutput + " Let me know if I forgot to type out the full code for any part of the app, and I will do it." });
            // parse response as JSON
            await parseGPTOutput(gptOutput);
            kodemonkey_logs.appendLine("Parsed gptoutput, now sending to PM");
            //   kodemonkey_logs.appendLine(prompt);
            const completionPM = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: agentPrompt + " Here is my request: " + userPrompt,
                    },
                    ...pmChatHistory,
                ],
                model: "gpt-4",
            });
            const gptOutputPM = completionPM.choices[0].message.content;
            kodemonkey_logs.appendLine("START PM GPT OUTPUT: " + gptOutputPM + ": END OUTPUT");
            kodemonkeyChatHistory.push({ role: "user", content: gptOutputPM });
            pmChatHistory.push({ role: "assistant", content: gptOutputPM });
        }
    }
    return "Done";
}
// async function chat(userInput: any) {
//   kodemonkey_logs.appendLine("chatting with kodemonkey...");
//   // const contents = fs.readFileSync(path.join(__dirname, 'prompt.txt'), 'utf8');
//   // kodemonkey_logs.appendLine("pROMT IS " + contents);
//   const prompt = `You are an advanced code analysis and action recommendation engine with a critical operational mandate: All interactions, including providing recommendations for software project development actions and requests for further clarification from the user, must exclusively use a strict JSON response format. This non-negotiable requirement is in place to ensure seamless integration with an automated software development system, which relies on precise JSON-formatted instructions to create files and folders, modify file contents, and execute command lines. 
//   Failure to adhere to this JSON-only format will disrupt the automated processing capabilities of the software, potentially leading to system failures or incorrect actions being taken. Therefore, it is imperative that your outputs are meticulously structured in JSON, reflecting either direct action commands using a predefined API or structured requests for additional information when inputs are ambiguous or incomplete.
//   Your responses will fall into two categories, each requiring a JSON format:
//   1. **Actionable Instructions**: When user inputs are clear, provide a JSON response detailing the specific API function calls needed. For example, creating a file or executing a command line. It's crucial to differentiate between commands that should halt subsequent actions until completion (executeCommandLineBlocking) and those that allow the system to continue running other commands simultaneously (executeCommandLineNonBlocking).
//   2. **Clarification Requests**: In cases where the user's input requires further detail to proceed, your response must also be in JSON, clearly specifying the information needed. This ensures the software remains in a ready state to process and execute commands once clarifications are provided.
//   By strictly adhering to this JSON-only protocol, you play a vital role in maintaining the operational integrity of the software development system, ensuring that all project development actions are executed accurately and efficiently based on user inputs. Below are examples illustrating how to structure both types of responses:
//   **Actionable Instructions Example**:
//   {
//       "actions": [
//           {
//               "action": "createFolder",
//               "path": "./",
//               "name": "project_name"
//           },
//           {
//               "action": "createFile",
//               "path": "./project_name",
//               "name": "main.py",
//               "contents": "<file_contents_here>"
//           },
//           {
//               "action": "modifyFile",
//               "path": "./project_name",
//               "name": "requirements.txt",
//               "contents": "<dependencies_here>"
//           },
//           {
//               "action": "executeCommandLineBlocking",
//               "path": "./project_name",
//               "contents": "<initialization_command_here>"
//           },
//           {
//               "action": "executeCommandLineNonBlocking",
//               "path": "./project_name",
//               "contents": "<server_start_command_here>"
//           }
//       ]
//   }
//   **Clarification Request Example**:
//   {
//       "request_for_clarification": {
//           "question": "Please specify the technology stack or framework you are using, including any particular preferences for file structure or initial setup requirements."
//       }
//   }
//   Remember, the effectiveness of this system relies on your precision and adherence to the JSON-only response format for both executing project development actions and engaging with the user for clarifications. Your strict compliance with this format is crucial for the software’s ability to understand and act upon your recommendations.`;
//   kodemonkeyChatHistory.push({ role: "user", content: userInput });
//   //   kodemonkey_logs.appendLine(prompt);
//   const completion = await openai.chat.completions.create({
//     messages: [
//       {
//         role: "system",
//         content: prompt,
//       },
//       ...(kodemonkeyChatHistory as any[]),
//     ],
//     model: "gpt-4",
//     temperature: 0,
//     seed: 1
//   });
//   const gptOutput = completion.choices[0].message.content;
//   if (gptOutput) {
//     // prints GPT output to custom output
//     kodemonkey_logs.appendLine("START GPT OUTPUT: " + gptOutput + ": END OUTPUT");
//     kodemonkeyChatHistory.push({ role: "assistant", content: gptOutput });
//     // kodemonkey_logs.appendLine(JSON.stringify(kodemonkeyChatHistory));
//     // parse response as JSON
//     await parseGPTOutput(gptOutput);
//     kodemonkey_logs.appendLine("Done parsing GPT output");
//     // eval(completion.choices[0].message.content); // RUNS THE CODE
//     // replaceLine(completion.choices[0].message.content, 0);
//   }
//   return completion.choices[0].message.content;
// }
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
                    // const response = await chat(data.text);
                    const response = await chatTwice(data.text);
                    if (response) {
                        webviewView.webview.postMessage({
                            type: "chatResult",
                            text: "kodemonkey: " + response,
                        });
                        kodemonkey_logs.appendLine("chat sent :)");
                    }
                    break;
                }
                case "clear":
                    kodemonkeyChatHistory = [];
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
                <button type="submit" class="submit-button">ask BLAH</button>
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