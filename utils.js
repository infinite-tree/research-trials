// 
// Common functions for all research trial apps
// 
var current_plant_id = "";
var current_plant_values = [];
var current_plant_seed_id = "";
var input = document.getElementById('latlong-input');
var plant_id_chip = document.getElementById('plant-id-span');
var plant_info = document.getElementById('plant-info-span');
var info_spinner = document.getElementById('info-spinner');

// the current or active gps coordinates of the device
var active_lat = "";
var active_long = "";

// the gps coordinates of the current plant
var current_plant_lat;
var current_plant_long;

const VERSION = "0.1.16";

function initVersionInfo() {
    document.getElementById("version-span").innerHTML = VERSION;
}


var loadJS = function(url, callback) {
    var scriptTag = document.createElement('script');
    scriptTag.src = url;

    scriptTag.onload = callback;
    scriptTag.onreadystatechange = callback;

    document.body.appendChild(scriptTag);
};


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
        desc += "<br>(seed " + plant_row[5] + ")";
    }
    return desc;
}

function displayCurrentPlant() {
    plant_info.innerHTML = plantText(current_plant_values);
    // Plant Id is the 3nd column
    plant_id_chip.innerHTML = current_plant_values[2];
    current_plant_id = current_plant_values[2];
}

function clearPlantInfo() {
    plant_info.innerHTML = "";
    plant_id_chip.innerHTML = "tap Looup";
}

async function loadPlant(search_value, search_type) {
    if (await getPlant(search_value, search_type)) {
        displayCurrentPlant();
    }
}

// 
// GPS Plant lookup and display functions
// 
async function lookupPlantByGeo(lat, long) {
    // 2 step process:
    //      1. put the coordinates into the geo location
    //      2. read back the closest ID
 
    try {
        var resp = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: INVENTORY_SPREADSHEET_ID,
            range: ACTIVE_LAT_LONG,
            valueInputOption: "USER_ENTERED",
            resource: {values: [[lat], [long]]}
        });

        if (resp.result.updatedCells != 2) {
            showError("Failed to send GPS location!");
            return false;
        }
    } catch (e) {
        showError(e.toString());
        return false;
    }

    try {
        var resp = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: INVENTORY_SPREADSHEET_ID,
            range: NEAREST_GEO_PLANT
        });

        var numRows = resp.result.values ? resp.result.values.length : 0;
        if (numRows != 1) {
            showError("Failed to lookup plant from location");
            return false;
        }

        console.log(resp.result.values);

        current_plant_id = resp.result.values[0][1];
        current_distance = resp.result.values[0][13];
        current_plant_values = resp.result.values[0];
        current_plant_lat = resp.result.values[0][11];
        current_plant_long = resp.result.values[0][12];

    } catch (e) {
        showError(e.toString());
        return false;
    }

    return true;
}

function displayCurrentGeoPlant() {
    var ft_distance = Math.round(parseFloat(current_distance) * 3.28084);

    plant_info.innerHTML = `<br>${current_plant_values[0]}<br><br>Seed Id: ${current_plant_values[4]} &nbsp;&nbsp;&nbsp;<span id="dist-span"><b>(${ft_distance}ft away)</b></span>`;

    // Plant Id is the 2nd column
    plant_id_chip.innerHTML = current_plant_values[1];
    current_plant_id = current_plant_values[1];
}

// 
// ID and ROW based plant lookup functions
// 
async function getPlant(search_value, search_type) {
    // search for tag

    // 1. First write the id or row into the search cell,
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
    } else if (search_type === "ROW") {
        search_range = ROW_SEARCH_FIELD_RANGE;
        result_range = ROW_SEARCH_RESULT_RANGE;
    } else if (search_type === "SEED") {
        search_range = SEED_SEARCH_FIELD_RANGE;
        result_range = SEED_SEARCH_RESULT_RANGE;
    } else {
        showError(`Internal Error: unknown search type: ${search_type}`);
        return false;
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
            return false;
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
            } else {
                showError("Unknown row");
            }
            return false;
        }
        console.log(result.values);

        current_plant_values = result.values[0];
        // TODO: create a dictionary, and maintain a single place for the column mapping (like the spreadsheet header!)
        current_plant_id = current_plant_values[2];
        current_plant_lat = parseFloat(current_plant_values[12]);
        current_plant_long = parseFloat(current_plant_values[13]);
        return true;
    } catch (e) {
        showError(e.toString());
        return false;
    }
}

function loadPlantById(plant_id) {
    plant_id_chip.innerHTML = "Searching";
    info_spinner.classList.add("is-active");
    plant_info.innerHTML = "";

    return loadPlant(plant_id, "ID");
}

function loadPlantByRow(plant_row) {
    plant_id_chip.innerHTML = "Searching";
    info_spinner.classList.add("is-active");
    plant_info.innerHTML = "";

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

function clearLatLong() {
    input.value = "";
    input.parentElement.classList.remove("is-dirty");
}

function calcDistance(prev_lat, prev_long, current_lat, current_long) {
    // The same function that is in the distance column of the google sheet
    var m_dist = 2 * 6371000 * Math.asin(Math.sqrt((Math.sin((prev_lat*(3.14159/180)-current_lat*(3.14159/180))/2))**2+Math.cos(prev_lat*(3.14159/180))*Math.cos(current_lat*(3.14159/180))*Math.sin(((prev_long*(3.14159/180)-current_long*(3.14159/180))/2))**2));
    return Math.round(m_dist * 3.28084);
}
