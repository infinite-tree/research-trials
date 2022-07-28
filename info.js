// 
// Info specific functions
// See utils.js for more
//

var current_distance;

function clearPlantInfo() {
    plant_info.innerHTML = "";
    plant_id_chip.innerHTML = "tap Looup";
}


function displayCurrentGeoPlant() {
    var ft_distance = Math.round(parseFloat(current_distance) * 3.28084);

    plant_info.innerHTML = `<br>${current_plant_values[0]}<br><br>Seed Id: ${current_plant_values[4]}<br><br><b>(${ft_distance}ft away)</b>`;

    // Plant Id is the 2nd column
    plant_id_chip.innerHTML = current_plant_values[1];
    current_plant_id = current_plant_values[1];
}


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

    } catch (e) {
        showError(e.toString());
        return false;
    }

    return true;
}


async function onLookupGeotagButton(e) {
    e.preventDefault();

    // update display while searching
    plant_info.innerHTML = "Looking ...";
    info_spinner.classList.add("is-active");
    input.value = "";
    input.parentElement.classList.remove("is-dirty");


    if(await lookupPlantByGeo(active_lat, active_long)) {        
        displayCurrentGeoPlant();

    } else {
        clearPlantInfo();
    }
    info_spinner.classList.remove("is-active");
}


function infoAppInit() {
    // Error handler
    initErrorDialog();

    document.getElementById('lookup-geotag-btn').addEventListener('click', onLookupGeotagButton);

    // Arrow buttons
    initArrowNav();

    // enable GPS device 
    initGPS(updateLatLongInput);

    // Load info if present
    loadByWindowLocation();
}


// 
// Application Entry Point
// 
startGAuth(infoAppInit);