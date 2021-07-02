var rfid_active = false;

async function inputHandler(e) {
    if (e.key === "Enter") {
        // tag entered. 
        e.preventDefault();
        await assignTagToCurrentPlant(input.value);
        await loadNextUntaggedPlant();
    }
}

async function rfidInputHandler(rfid_tag) {
    if (rfid_active) {
        // block multiple reads
        return;
    }
    rfid_active = true;
    input.value = rfid_tag;
    input.parentElement.classList.add("is-dirty");

    var res = await assignTagToCurrentPlant(rfid_tag);
    if (res) {
        await loadNextUntaggedPlant();
    }
    rfid_active = false;
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

    // enable HID based RFID reader if possible
    initHidRFID(rfidInputHandler);

    // Load info if present
    if (!loadByLocation()) {
        // Load initial tag
        loadNextUntaggedPlant();
    }
}


// 
// Application Entry Point
// 
startGAuth(newTagAppInit);