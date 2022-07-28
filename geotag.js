
var qr_dialog = document.getElementById("qr-dialog");
const html5QrCode = new Html5Qrcode("qr-reader");

var current_seed_population_name = "";
var current_seed_population_id;
var current_population_count;
var current_population_assigned = 0;

var last_assigned_plant_id = "";
var last_assigned_lat;
var last_assigned_long;


async function onQRScanSuccess(decodedText, decodedResult) {
    // Handle on success condition with the decoded message.
    console.log(`Scan result ${decodedText}`, decodedResult);

    await html5QrCode.stop();
    qr_dialog.close();

    // Redirect to page with qr code location
    var params = decodedText.split('?')[1];
    window.history.replaceState(null, null, "?"+params);
    await loadGeoTagByWindowLocation();
}

async function onQRExitButton(e) {
    e.preventDefault();

    await html5QrCode.stop();
    qr_dialog.close();
}


function onQRScanButton(e) {
    e.preventDefault();

    // Show the qr-scanner dialog and hook up the buttons
    if (! qr_dialog.showModal) {
      dialogPolyfill.registerDialog(qr_dialog);
    }
    qr_dialog.showModal();

    document.getElementById("exit-qr-scanner").addEventListener('click', onQRExitButton);

    // start the scanner
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: "environment" }, config, onQRScanSuccess);
}

function displayCurrentSeedPopulation() {
    // TODO: refactor plant_row array into dictionary
    current_seed_population_name = current_plant_values[1];

    // Id is the 3rd column
    if (current_seed_population_id != current_plant_values[2]) {
        showError(`INTERNAL ERROR: Seed Lookup mismatch ${current_seed_population_id} vs ${current_plant_values[2]}`);
        return;
    }

    plant_info.innerHTML = "<br>" + current_seed_population_name + "<br><br><b>(assigned " + current_population_assigned + " of " + current_population_count + ")</b>";
    plant_id_chip.innerHTML = "Seed " + current_seed_population_id;
    current_plant_id = current_seed_population_id;
}


async function loadSeedPopulation(search_value, search_type) {
    if (await getPlant(search_value, search_type)) {
        displayCurrentSeedPopulation();
    }
}

function loadSeedPopulationById(plant_id) {
    return loadSeedPopulation(plant_id, "ID");
}

async function assignLocationToPlant(name, seed_id, lat, long) {
    // TODO: location, size, source, etc should be configurable somewhere
    // var name = name;
    var donor_id = "";
    var receiver_id = "";
    // var seed_id = seed_id;
    var seed_qty = "";
    var plant_size = "4'";
    var location = "field";
    var source = "";
    // TODO: remove RFID support
    var rfid = "";
    var row = "";
    // var lat = lat;
    // var long = long;
    var distance = "";

    // 
    // This creates the plant from the seed population and assigns it's location in 1 action
    // 

    // Step 1: get the next available plant ID
    try {
        var resp = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: INVENTORY_SPREADSHEET_ID,
            range: LAST_PLANT_ID
        });
        var result = resp.result;
        var numRows = result.values ? result.values.length : 0;
        if (numRows < 1) {
            showError(`INTERNAL ERROR: Failed to get last plant ID`);
            return false;
        }

        // Increment the ID
        console.log(result.values);
        var new_id = parseInt(result.values[0][0]) + 1;
        console.log(`New id: ${new_id}`);
    } catch (e) {
        showError(e.toString());
        return false;
    }

    // create and insert the new row
    try {
        var resp = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: INVENTORY_SPREADSHEET_ID,
            range: INVENTORY_RANGE,
            insertDataOption: "INSERT_ROWS",
            valueInputOption: "USER_ENTERED",
            resource: {values: [[name, new_id, donor_id, receiver_id, seed_id, seed_qty, plant_size, location, source, rfid, row, lat, long, distance]]}
        });
        // console.log(resp);
        if (resp.result.updates.updatedRows < 1) {
            showError("Failed to update inventory");
            return false;
        }

        last_assigned_plant_id = new_id;
        last_assigned_lat = lat;
        last_assigned_long = long;

    } catch (e) {
        showError(e.toString());
        return false;
    }

    return true;
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

async function onSaveGeotagButton(e) {
    e.preventDefault();

    var saved_info = plant_info.innerHTML;
    info_spinner.classList.add("is-active");
    plant_info.innerHTML = "Saving ...";

    if (active_lat === "" || active_long === "") {
        showError("No GPS location!");
        return;
    }
    if (current_seed_population_name === "") {
        showError("Seed Population not loaded!");
        return;
    }

    if (await assignLocationToPlant(current_seed_population_name, current_seed_population_id, active_lat, active_long)) {
        // Show saved info, update the counter,
        current_population_assigned += 1;
        if (current_population_assigned >= current_population_count) {
            document.getElementById('save-geotag-btn').disabled = true;
        }

        info_spinner.classList.remove("is-active");
        displayCurrentSeedPopulation();
        console.log("redisplay: ", last_assigned_plant_id)
        plant_info.innerHTML = `Created ${last_assigned_plant_id}<br>` + plant_info.innerHTML;

    } else {
        // Error was already shown. Reset the status
        info_spinner.classList.remove("is-active");
        plant_info.innerHTML = saved_info;
    }
}

function updateLatLongCallback(lat, long) {
    updateLatLongInput(lat, long);

    if (last_assigned_id != "") {
        var ft_dist = calcDistance(last_assigned_lat, last_assigned_long, lat, long);
        console.log("distance: ", ft_dist);
        document.getElementById("prev-dist-span").innerHTML = `<b>(${ft_dist} ft from prev)</b>`;
    }
}

async function loadGeoTagByWindowLocation() {
    var params = new URLSearchParams(window.location.search);
    if (params.has('id')) {
        var plant_id = params.get('id');
        var count = 0;

        if (params.has('count')) {
            count = parseInt(params.get('count'));
        }

        // Workaround for typo in QR codes (',' instead of '&'):
        if (plant_id.includes(',')) {
            var parts = plant_id.split(',');
            plant_id = parts[0];
            var count_parts = parts[1].split('=');
            count = parseInt(count_parts[1]);
        }

        // Set globals and load seed population
        console.log("Loading plant ", plant_id);
        console.log("count = ", count);
        current_seed_population_id = plant_id
        current_population_count = count;
        current_population_assigned = 0;
        await loadSeedPopulationById(plant_id);
    }
}

function geotagAppInit() {
    // Error handler
    initErrorDialog();

    // Arrow buttons
    // initArrowNav();

    // Init QR code scanner
    // html5QrcodeScanner.render(onQRScanSuccess);
    document.getElementById('scan-qr-btn').addEventListener('click', onQRScanButton);
    document.getElementById('save-geotag-btn').addEventListener('click', onSaveGeotagButton);

    initGPS(updateLatLongCallback, clearLatLong);

    // Load info if present
    loadGeoTagByWindowLocation();
}


// 
// Application Entry Point
// 
startGAuth(geotagAppInit);