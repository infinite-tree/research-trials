// 
// Info specific functions
// See utils.js for more
// 
async function inputHandler(e) {
    if (e.key === "Enter") {
        // tag entered. 
        e.preventDefault();
        await loadPlantByTag(input.value);
    }
}

function loadByLocation() {
    var params = new URLSearchParams(window.location.search);
    if (params.has('tag')) {
        loadPlantByTag(params.get('tag'));
    } else if (params.has('id')) {
        loadPlantById(params.get('id'));
    }
}

function infoAppInit() {
    // set focus to the text field and get the keys from it
    input.focus();
    input.select();
    input.addEventListener('keydown', inputHandler);

    // Error handler
    initErrorDialog();

    // Arrow buttons
    document.getElementById('info-left').addEventListener('click', loadPrevPlant);
    document.getElementById('info-right').addEventListener('click', loadNextPlant);

    // Load info if present
    loadByLocation();
}


// 
// Application Entry Point
// 
startGAuth(infoAppInit);