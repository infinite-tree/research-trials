// 
// Common functions for all research trial apps
// 
var current_plant_id = "";
var current_plant_values = [];
var input = document.getElementById('rfid-input');
var plant_id_chip = document.getElementById('plant-id-span');
var plant_info = document.getElementById('plant-info-span');
var info_spinner = document.getElementById('info-spinner');

var rfid_callback = null;


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
    });
}


// 
// Plant query and loading functions
// 

function plantText(plant_row) {
    // Name is the second column, Size 8th, location 9th
    return"<br>" + plant_row[1] + "<br><br><b>" + plant_row[7] + " in " + plant_row[8] + "</b>";
}

async function loadPlant(search_value, search_by_tag) {
    // search for tag
    plant_id_chip.innerHTML = "Searching";
    info_spinner.classList.add("is-active");
    plant_info.innerHTML = "";

    // 1. First write the rfid number to the search cell,
    // 2. Then read the row result
    // NOTE: this is becuase there is no search api and too many rows to download locally
    // TODO: This should probably write the search formula as well to random cell to avaoid
    // race conditions with other instances
    //
    var body = {
        values: [[search_value]]
    };

    var search_range = RFID_SEARCH_FIELD_RANGE;
    var result_range = RFID_SEARCH_RESULT_RANGE;
    if (!search_by_tag) {
        search_range = ID_SEARCH_FIELD_RANGE;
        result_range = ID_SEARCH_RESULT_RANGE;
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
        input.focus();
        input.select();

        // Process result
        result = resp.result;
        var numRows = result.values ? result.values.length : 0;
        if (numRows != 1) {
            if (search_by_tag) {
                showError("Unknown Tag");
            } else {
                showError("Unknown plant id");
            }
        }
        // console.log(result.values[0]);

        current_plant_values = result.values[0];
        plant_info.innerHTML = plantText(result.values[0]);
        // Plant Id is the 3nd column
        plant_id_chip.innerHTML = result.values[0][2];
        current_plant_id = result.values[0][2];

    } catch (e) {
        info_spinner.classList.remove("is-active");
        showError(e.toString());
    }
}

function loadPlantByTag(rfid_tag) {
    return loadPlant(rfid_tag, true);
}

function loadPlantById(plant_id) {
    return loadPlant(plant_id, false);
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

        console.log(result.values);
        // Load the first untagged (not the last tagged)
        var plant_id = result.values[0][2];
        console.log(plant_id);
        await loadPlantById(plant_id);
        
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
            return;
        }

        // Success!
        info_spinner.classList.remove("is-active");
        plant_info.innerHTML = "Success";

    } catch (e) {
        showError(e.toString());
    }
}


// 
// UI helpers
// 
async function loadPrevPlant(e) {
    e.preventDefault();
    if (current_plant_id === "") {
        return;
    }

    // Convert plant_id to int and query
    var prev_id = parseInt(current_plant_id) - 1;
    if (prev_id < 0) {
        prev_id = 0;
    }
    await loadPlantById(prev_id.toString());
}

async function loadNextPlant(e) {
    e.preventDefault();
    if (current_plant_id === "") {
        return;
    }

    // Convert plant_id to int and query
    var next_id = parseInt(current_plant_id) + 1;
    await loadPlantById(next_id.toString());
}



// 
// Webhid
// 
function hidReportHandler(event) {
    event.preventDefault();
    const { data, device, reportId } = event;
    console.log(data);

    var rfid_tag = "";
    for (let x=19 ; x< 31; x++) {
        var code = data.getUint8(x);
        rfid_tag += code.toString(16).toUpperCase().padStart(2, "0");
    }
    console.log(`RFID Tag: ${rfid_tag}`);
    
    // populate the input field and trigger the action.
    if (rfid_callback !== null) {
        rfid_callback(rfid_tag);
    }
}

async function handleReaderConnect(e) {
    e.preventDefault();
    if (!"hid" in navigator) {
        console.log("no hid device support");
        return;
    }

    // Prompt user to enable hid reader
    const device_list = await navigator.hid.getDevices();
    console.log(device_list)

    let device = device_list.find(d => d.vendorId === VENDOR_ID && d.productId === PRODUCT_ID);

    if (!device) {
        // this returns an array now
        let devices = await navigator.hid.requestDevice({
            filters: [{ VENDOR_ID, PRODUCT_ID }],
        });
        // console.log("devices:",devices);
        device = devices[0];
        if( !device ) return;
    }

    if (!device.opened) {
        await device.open();
    }
    device.addEventListener("inputreport", hidReportHandler);
}

function initHidRFID(callback) {
    rfid_callback = callback;
    document.getElementById('reader-connect').addEventListener('click', handleReaderConnect);
}