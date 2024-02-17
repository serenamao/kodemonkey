import * as vscode from "vscode";
import * as path from "path";
import OpenAI from "openai";

// custom terminal output channel
let kodemonkey = vscode.window.createOutputChannel("kodemonkey");

const openai = new OpenAI({
  apiKey: "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",
});

// base function with which file creation is based upon
async function createFileBaseFunction(
  filePath: string = "testcreatefile/testfile.txt",
  content: string
) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    const workspacePath = workspaceFolders[0].uri; // Get the path of the first workspace folder
    const newFilePath = vscode.Uri.joinPath(workspacePath, filePath); // Create a new Uri for the new file

    const newFileDir = vscode.Uri.joinPath(
      workspacePath,
      path.dirname(filePath)
    ); // Get the directory of the new file
    await vscode.workspace.fs.createDirectory(newFileDir); // Create the directory if it does not exist

    const newFileData = Buffer.from(content, "utf8"); // Create a buffer for the file content
    await vscode.workspace.fs.writeFile(newFilePath, newFileData); // Write the file
  } else {
    vscode.window.showErrorMessage(
      "No workspace folder found. Please open a workspace first."
    );
  }
}

// creates file with empty contents
async function createFile(
  filePath: string = "testcreatefile/testfile.txt",
  content: string
) {
  createFileBaseFunction(filePath, "");
}

// overwrites existing file with content
async function overwriteFile(
  filePath: string = "testcreatefile/testfile.txt",
  content: string
) {
  createFileBaseFunction(filePath, content);
}

function replaceLine(newText: string, linenum: number) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const line = editor.document.lineAt(linenum - 1);
    editor.edit((editBuilder) => {
      editBuilder.replace(line.range, newText); // Replace the line with the new text
    });
    vscode.commands.executeCommand("editor.action.formatDocument");
  }
}

function insertText(text: string) {
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

async function chat(userInput: any) {
  kodemonkey.appendLine("Chatting and creating test file");
  createFile("test.txt", "Hello, world!");

  const linesWithNumbers = await getLinesWithNumbers(); // Await the getLinesWithNumbers() function call
  kodemonkey.appendLine(linesWithNumbers); // Pass the result to kodemonkey.appendLine()
  const prompt = `Given the code context, return the exact line of code with the annotated line number that needs to be changed, as well as the new line of code. Please return a string with correct indentation. In this format: replaceLine('updated line of code with correct indentation', lineNumber)`;

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: prompt + "here is my code: " + linesWithNumbers,
      },
      { role: "user", content: userInput },
    ],
    model: "gpt-3.5-turbo",
  });
  if (completion.choices[0].message.content) {
    kodemonkey.appendLine(completion.choices[0].message.content);
    eval(completion.choices[0].message.content);
    // replaceLine(completion.choices[0].message.content, 0);
  }

  //   if (completion.choices[0].message.content) {
  // 	kodemonkey.appendLine(completion.choices[0].message.content);
  // 	const functionCall = completion.choices[0].message.content;
  // if (functionCall.startsWith('createFile(') || functionCall.startsWith('insertText(')) {
  //     eval(functionCall);
  // } else {
  //     console.log('Invalid function call:', functionCall);
  // }
  //   }

  return completion.choices[0].message.content;
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new ColorsViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ColorsViewProvider.viewType,
      provider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("kodemonkey.insertMultiLine", () => {
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
    })
  );

  // replaces multi lines of code with multiple lines of code (not necessary same number)
  context.subscriptions.push(
    vscode.commands.registerCommand("kodemonkey.replaceMultiLine", () => {
      // parameters: textToInsert(String with newlines to replace old code with), lineStartReplace (number of line to begin replacement), lineEndReplace (number of line to end replacement)
      const editor = vscode.window.activeTextEditor;
      const lineStartReplace = 0;
      const lineEndReplace = 1;

      const textToInsert = "let a = 1;\nlet b = 2;\nlet c = 3;";
      if (editor) {
        const start = new vscode.Position(lineStartReplace, 0); // Line 1, character 0
        const end = new vscode.Position(
          lineEndReplace,
          editor.document.lineAt(lineEndReplace).text.length
        ); // Line 2, end of line

        const range = new vscode.Range(start, end);

        editor.edit((editBuilder) => {
          editBuilder.replace(range, textToInsert);
        });
      }
    })
  );

  // create a file and insert content into that file
  context.subscriptions.push(
    vscode.commands.registerCommand("kodemonkey.createNewFile", () => {
      // parameters: filePath (relative path to file from workspace root), content (content to insert into file)
      createFile("testcreatefile/testfile.txt", "Hello, world!");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("kodemonkey.overwriteFile", () => {
      overwriteFile("testcreatefile/testfile.txt", "Overwritten!!");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("kodemonkey.runCommandInTerminal", () => {
      const terminal = vscode.window.createTerminal(
        `Ext Terminal #${Math.random()}`
      );
      terminal.sendText("npx create-react-app my-app && cd my-app && npm start");
      terminal.show();
    })
  );
}

class ColorsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "kodemonkey.colorsView";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
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
            kodemonkey.appendLine("posted");
          }
          break;
        }
        // case 'colorSelected':
        // 	{
        // 		vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
        // 		break;
        // 	}
      }
    });
  }

  // public addColor() {
  // 	if (this._view) {
  // 		this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
  // 		this._view.webview.postMessage({ type: 'addColor' });
  // 	}
  // }

  // public clearColors() {
  // 	if (this._view) {
  // 		this._view.webview.postMessage({ type: 'clearColors' });
  // 	}
  // }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js")
    );

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css")
    );

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
				<input type="text" class="user-input" placeholder="What's your question">
                <button class="submit-button">ask kodemonkey</button>


				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
            </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
