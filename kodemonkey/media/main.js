// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();
    const oldState = vscode.getState() || { messages: ["Initial message"] };

    // when user clicks submit button
    document.querySelector('.submit-button').addEventListener('click', () => {

        clickSubmitHandler();
    });
    // when user clicks submit button
    document.querySelector('.clear-button').addEventListener('click', () => {

        clearHistoryHandler();
    });

    // when the user is typing in the box
    document.querySelector('.user-input').addEventListener('change', (e) => {
        onInputChange(e);
    });

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        console.log("message received");
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'chatResult':
                {
                    const p = document.querySelector('p');
                    break;
                }

            case 'clickSubmit':
                {
                    // add some code here
                    break;
                }
            case 'clarification':
                {
                    const p = document.querySelector('p');
                    p.innerHTML += `<br><strong>kodemonkey</strong>: ${message.text}`;
                    break;
                }

        }
    });
    function onInputChange(e) {
        vscode.setState({ text: "FINAL TEST 2" });
    }

    function clickSubmitHandler() {
        // Get the current text inside the input box
        const inputBox = document.querySelector('.user-input');
        const currentText = inputBox.value;

        // Select the existing <p> tag
        const p = document.querySelector('p');

        // Append the current text to the <p> tag
        p.innerHTML += `<br><strong>you</strong>: ${currentText}`;

        vscode.postMessage({
            type: 'submit',
            text: currentText
        });
        // Reset user input box 
        document.querySelector('.user-input').value = '';


    }

    function clearHistoryHandler() {
        // Select the existing <p> tag
        const p = document.querySelector('p');
        p.innerHTML = "Start your chat here!";
        vscode.postMessage({
            type: 'clear'
        });
    }



}());

