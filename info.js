// 
// Info specific functions
// See utils.js for more
//

var current_distance;
var google_map;
var gps_ready = false;
var plant_marker;
var user_marker;

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
    initGoogleMaps();
}

function onNewGPSCoordinates(lat, long) {
    updateLatLongInput(lat, long);
    if (!gps_ready) {
        gps_ready = true;
        // initGoogleMaps();
        document.getElementById("lookup-plant-id-btn").disabled = false;
    }
    if (user_marker) {
        user_marker.setPosition({lat: active_lat, lng: active_long});
    }

}

function initGoogleMaps() {
    console.log("init map");
    if (gps_ready) {
        // The map, centered at the user's location
        google_map = new google.maps.Map(document.getElementById("map"), {
            zoom: 12,
            center: {lat: active_lat, lng: active_long},
            disableDefaultUI: false,
            clickableIcons: false,
            mapTypeId: google.maps.MapTypeId.SATELLITE
        });
        user_marker = new google.maps.Marker({
            map: google_map,
            draggable: false,
            icon: "/user_icon.png",
            position: {lat: active_lat, lng: active_long}
        });
        console.log("map created");
    }
}

async function onPlantLookupButton(e) {
    e.preventDefault(); 
    if (!google_map) {
        initGoogleMaps();
    }
    document.getElementById("plant-id-map-span").innerHTML = "...";

    // create marker for plant
    var plant_id = document.getElementById("plant-id-input").value;
    var span_txt = `Plant ${plant_id}`;
    
    await getPlant(plant_id, "ID");
    if (!current_plant_lat && !current_plant_seed_id) {
        // The id was likely a seed population. Lookup the first plant
        span_txt = `Seed ${current_plant_id}`;
        await getPlant(current_plant_id, "SEED");
    }
    
    document.getElementById("plant-id-map-span").innerHTML = span_txt;

    if (!plant_marker) {
        plant_marker = new google.maps.Marker({
            map: google_map,
            draggable: false,
            icon: "plant_icon.png",
            position: { lat: current_plant_lat, lng: current_plant_long }
        });
        console.log("marker created");
    } else {
        plant_marker.setPosition({lat: current_plant_lat, lng: current_plant_long});
    }

    var markers = [plant_marker, user_marker];
    var bounds = new google.maps.LatLngBounds();
    for(i=0;i<markers.length;i++) {
        bounds.extend(markers[i].getPosition());
    }
    //center the map to the geometric center of all markers
    google_map.setCenter(bounds.getCenter());

    google.maps.event.addListenerOnce(google_map, 'bounds_changed', function(event) {
        this.setZoom(google_map.getZoom()-1);
      
        // if (this.getZoom() > 15) {
        //   this.setZoom(15);
        // }
    });

    google_map.fitBounds(bounds);
}


function infoAppInit() {
    // Error handler
    initErrorDialog();

    initVersionInfo();

    // load the Maps API using the API_KEY
    loadJS(`https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&v=weekly`, initGoogleMaps, document.body);


    document.getElementById('lookup-geotag-btn').addEventListener('click', onLookupGeotagButton);
    document.getElementById('lookup-plant-id-btn').addEventListener('click', onPlantLookupButton);
    document.getElementById("plant-id-input").onkeydown = e => {
        if (e.key=="Enter") {
            e.preventDefault();
            document.getElementById("lookup-plant-id-btn").click();
            return false;
         } else {
            return true;
         }
    };


    // Arrow buttons
    initArrowNav();

    // enable GPS device 
    initGPS(onNewGPSCoordinates, gpsConnected);

    // Load info if present
    loadByWindowLocation();

    // FIXME: remove
    // setInterval(function(){
    //     onNewGPSCoordinates(42.313133333, -123.266316667);
    // }, 1000);
}


// 
// Application Entry Point
// 
startGAuth(infoAppInit);