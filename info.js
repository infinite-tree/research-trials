// 
// Info specific functions
// See utils.js for more
//
var rfid_active = false;

async function inputHandler(e) {
    if (e.key === "Enter") {
        // tag entered. 
        e.preventDefault();
        console.log("enter.", input.value);

        var rfid = input.value;
        input.value = "";
        
        if (rfid_active) {
            // block multiple reads
            return;
        }
        
        rfid_active = true;
        await loadPlantByTag(rfid);
        rfid_active = false;

    } else {
        if (rfid_active) {
            // block additional data while searching
            e.preventDefault();
            return;
        }
        await arrowKeyHandler(e);
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

    console.log(`Searching for tag: ${rfid_tag}`);
    await loadPlantByTag(rfid_tag);
    rfid_active = false;
}

function infoAppInit() {
    // set focus to the text field and get the keys from it
    input.focus();
    input.select();
    input.addEventListener('keydown', inputHandler);

    // Error handler
    initErrorDialog();

    // Arrow buttons
    initArrowNav();

    // enable HID based RFID reader if possible
    initHidRFID(rfidInputHandler);

    // Load info if present
    loadByLocation();
}


// 
// Application Entry Point
// 
startGAuth(infoAppInit);