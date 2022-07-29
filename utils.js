// 
// Common functions for all research trial apps
// 
var current_plant_id = "";
var current_plant_values = [];
var input = document.getElementById('latlong-input');
var plant_id_chip = document.getElementById('plant-id-span');
var plant_info = document.getElementById('plant-info-span');
var info_spinner = document.getElementById('info-spinner');

var rfid_callback = null;

var active_lat = "";
var active_long = "";

const VERSION = "0.1.01";

function initVersionInfo() {
    document.getElementById("version-span").innerHTML = VERSION;
}


// 
// Error functions
// 
var error_dialog = document.getElementById('error-dialog');
function showError(error_msg) {
    console.log("Error:");
    console.log(error_msg);

    document.getElementById('error-message').innerHTML = error_msg;
    error_dialog.showModal();
}

function initErrorDialog() {
    if (! error_dialog.showModal) {
        dialogPolyfill.registerDialog(error_dialog);
    }
    error_dialog.querySelector('button:not([disabled])').addEventListener('click', function() {
        error_dialog.close();
        try {
            // Assuming there is an input, move focus back to it after the error dialog is closed.
            input.focus();
            input.select();    
        } catch (e) {
            return;
        }
    });
}


// 
// Plant query and loading functions
// 
function plantText(plant_row) {
    // Name is the second column, Size 8th, location 9th
    var desc ="<br>" + plant_row[1] + "<br><br><b>" + plant_row[7] + " in " + plant_row[8] + "</b>";
    if (plant_row[5]) {
        desc += "<br>(" + plant_row[5] + ")";
    }
    return desc;
}

function displayCurrentPlant() {
    plant_info.innerHTML = plantText(current_plant_values);
    // Plant Id is the 3nd column
    plant_id_chip.innerHTML = current_plant_values[2];
    current_plant_id = current_plant_values[2];

    // rfid is the 11th column
    if (current_plant_values.length > 10 && current_plant_values[10] !== "") {
        // input.value = current_plant_values[10];
        input.parentElement.classList.add("is-dirty");
    }
}

async function loadPlant(search_value, search_type) {
    if (await getPlant(search_value, search_type)) {
        displayCurrentPlant();
    }
}

async function getPlant(search_value, search_type) {
    // search for tag
    plant_id_chip.innerHTML = "Searching";
    info_spinner.classList.add("is-active");
    plant_info.innerHTML = "";

    // 1. First write the rfid number to the search cell,
    // 2. Then read the row result
    // NOTE: this is becuase there is no search api and too many rows to download locally
    // TODO: This should probably write the search formula as well to random cell to avoid
    // race conditions with other instances
    //
    var body = {
        values: [[search_value]]
    };

    var search_range;
    var result_range;
    if (search_type === "ID") {
        search_range = ID_SEARCH_FIELD_RANGE;
        result_range = ID_SEARCH_RESULT_RANGE;
    } else if (search_type === "RFID") {
        search_range = RFID_SEARCH_FIELD_RANGE;
        result_range = RFID_SEARCH_RESULT_RANGE;
    } else if (search_type === "ROW") {
        search_range = ROW_SEARCH_FIELD_RANGE;
        result_range = ROW_SEARCH_RESULT_RANGE;
    } else {
        showError(`Internal Error: unknown search type: ${search_type}`);
        return;
    }

    try {
        // 1.
        var resp = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: INVENTORY_SPREADSHEET_ID,
            range: search_range,
            valueInputOption: "USER_ENTERED",
            resource: body
        });

        var result = resp.result;
        if (result.updatedCells < 1) {
            showError("Failed to start search");
            return;
        }

        // 2.
        resp = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: INVENTORY_SPREADSHEET_ID,
            range: result_range
        });
        info_spinner.classList.remove("is-active");
        input.value = "";
        input.parentElement.classList.remove("is-dirty");
        // input.focus();
        // input.select();

        // Process result
        result = resp.result;
        var numRows = result.values ? result.values.length : 0;
        if (numRows != 1) {
            if (search_type  === "ID") {
                showError("Unknown Tag");
            } else if (search_type === "RFID") {
                showError("Unknown plant id");
            } else {
                showError("Unknown row");
            }
            return;
        }
        console.log(result.values);

        current_plant_values = result.values[0];
        // displayCurrentPlant();
        return true;
    } catch (e) {
        info_spinner.classList.remove("is-active");
        showError(e.toString());
        return false;
    }
}

function loadPlantByTag(rfid_tag) {
    return loadPlant(rfid_tag, "RFID");
}

function loadPlantById(plant_id) {
    return loadPlant(plant_id, "ID");
}

function loadPlantByRow(plant_row) {
    return loadPlant(plant_row, "ROW");
}

async function loadNextUntaggedPlant() {
    plant_id_chip.innerHTML = "Loading Plant...";
    info_spinner.classList.add("is-active");
    plant_info.innerHTML = "";

    try {
        // Look up the last tagged row
        var resp = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: INVENTORY_SPREADSHEET_ID,
            range: CURRENT_ROW_TO_TAG_RANGE
        });
        info_spinner.classList.remove("is-active");
        input.value = "";

        var result = resp.result;
        var numRows = result.values ? result.values.length : 0;
        if (numRows != 1) {
            showError("Couldn't find plant to tag");
            return;
        }

        // Load the first untagged (not the last tagged)
        current_plant_id = result.values[0][2];
        current_plant_values = result.values[0];
        displayCurrentPlant();
        
    } catch (e) {
        info_spinner.classList.remove("is-active");
        showError(e.toString());
    }
}

// 
// Plant manipulation functions
// 
async function assignTagToCurrentPlant(rfid_tag) {
    // At this point the current plant's row and values should be stored in current_plant_values.
    // As a reminder, queries are done via the search sheet, but data is written back to the inventory
    // sheet using the row
    info_spinner.classList.add("is-active");
    plant_info.innerHTML = "Saving ...";

    var row_number = current_plant_values[0];
    var plant_row_range = INVENTORY_SHEET + "!" + RFID_COLUMN + row_number;
    var next_row = (parseInt(row_number) + 1).toString();

    try {
        // make sure the rfid tag does not already exist
        //  This prevents duplicate writes when moving quickly
        var resp = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: INVENTORY_SPREADSHEET_ID,
            range: RFID_SEARCH_FIELD_RANGE,
            valueInputOption: "USER_ENTERED",
            resource: {values: [[rfid_tag]]}
        });

        var result = resp.result;
        if (result.updatedCells < 1) {
            showError("Failed to validate tag");
            return false;
        }


        resp = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: INVENTORY_SPREADSHEET_ID,
            range: RFID_SEARCH_RESULT_RANGE
        });
        result = resp.result;
        var numRows = result.values ? result.values.length : 0;
        if (numRows == 1) {
            var plant_id = result.values[0][2];
            showError(`RFID Tag is already assigned to plant ${plant_id}`);
            plant_info.innerHTML = "";
            return false;
        }

    } catch (e) {
        showError(e.toString());
        return false;
    }


    // Write the tag
    var body = {
        data: [
            {
                range: plant_row_range,
                values: [[rfid_tag]]
            },
            {
                range: CURRENT_ROW_TO_TAG,
                values: [[next_row]]
            }
        ],
        valueInputOption: "USER_ENTERED"
    }

    try {
        var resp = await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: INVENTORY_SPREADSHEET_ID,
            resource: body
        });

        if (resp.result.totalUpdatedCells < 2) {
            showError("Failed to update plant");
            return false;
        }

        // Success!
        info_spinner.classList.remove("is-active");
        plant_info.innerHTML = "Success";

    } catch (e) {
        showError(e.toString());
        return false;
    }
    return true;
}


// 
// UI helpers
// 
async function loadPrevPlant(e) {
    e.preventDefault();
    if (current_plant_id === "") {
        return;
    }

    // Convert plant row to int and query
    var prev_row = parseInt(current_plant_values[0]) - 1;
    if (prev_row < 2) {
        prev_row = 2;
    }
    await loadPlantByRow(prev_row.toString());
}

async function loadNextPlant(e) {
    e.preventDefault();
    if (current_plant_id === "") {
        return;
    }

    // Convert plant row to int and query
    var next_row = parseInt(current_plant_values[0]) + 1;
    await loadPlantByRow(next_row.toString());
}

async function arrowKeyHandler(e) {
    if (e.which == 37) {
        // Left arrow, load prev
        e.preventDefault();
        return loadPrevPlant(e);
    } else if (e.which == 39) {
        // Right arrow, load next
        e.preventDefault();
        return loadNextPlant(e);
    }
}

function initArrowNav() {
    document.getElementById('info-left').addEventListener('click', loadPrevPlant);
    document.getElementById('info-right').addEventListener('click', loadNextPlant);
}


function loadByWindowLocation() {
    var params = new URLSearchParams(window.location.search);
    if (params.has('tag')) {
        loadPlantByTag(params.get('tag'));
        window.history.replaceState(null, null, window.location.pathname);
        return true;
    } else if (params.has('id')) {
        loadPlantById(params.get('id'));
        window.history.replaceState(null, null, window.location.pathname);
        return true;
    }
    return false;
}


// 
// GPS helpers
// 

// To be called by GPS code
function updateLatLongInput(lat, long) {
    active_lat = lat;
    active_long = long;
    input.value = lat.toFixed(8) + ", " + long.toFixed(8);
    input.parentElement.classList.add("is-dirty");
}