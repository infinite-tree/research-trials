async function inputHandler(e) {
    if (e.key === "Enter") {
        // tag entered. 
        e.preventDefault();
        await assignTagToCurrentPlant(input.value);
        await loadNextUntaggedPlant();
    }
}

function newTagAppInit() {
    // set focus to the text field and get the keys from it
    input.focus();
    input.select();
    input.addEventListener('keydown', inputHandler);

    // Error handler
    initErrorDialog();

    // Arrow buttons
    document.getElementById('info-left').addEventListener('click', loadPrevPlant);
    document.getElementById('info-right').addEventListener('click', loadNextPlant);

    // Load initial tag
    loadNextUntaggedPlant();
}


// 
// Application Entry Point
// 
startGAuth(newTagAppInit);