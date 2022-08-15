// 
// Info specific functions
// See utils.js for more
//

var current_distance;

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

function gpsConnected() {
    plant_id_chip.innerHTML = "Tap Lookup";
}



function infoAppInit() {
    // Error handler
    initErrorDialog();

    initVersionInfo();

    document.getElementById('lookup-geotag-btn').addEventListener('click', onLookupGeotagButton);

    // Arrow buttons
    initArrowNav();

    // enable GPS device 
    initGPS(updateLatLongInput, gpsConnected);

    // Load info if present
    loadByWindowLocation();
}


// 
// Application Entry Point
// 
startGAuth(infoAppInit);