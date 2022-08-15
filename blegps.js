// 
// Web BLE - GPS device via BLE serial messages
//           NMEA - GNRMC
// 

// Bluetooth LE GATT UUIDs for the Nordic UART profile
const BLE_SERIAL_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

var gps_device = null;
var gps_connected = false;
var gps_data_callback = null;
var gps_connected_callback = null;
var gps_disconnect_callback = null;

const gps_retry_limit = 3;
var gps_retry_count = 0;


async function handleGPSDisconnected(e) {
    console.log("BLE disconnected");
    gps_connected = false;
    gps_device = null;

    document.getElementById("gps-status").style.color="red";
    document.getElementById("gps-status").innerHTML = "public_off";
    document.getElementById('connect-gps').innerHTML = "Connect GPS";

    if (e === "reconnect") {
        console.log("reconnecting");
        if (gps_retry_count <= gps_retry_limit) {
            gps_retry_count += 1;
            await connectGPS();
        }
    } else {
        if (gps_disconnect_callback != null) {
            gps_disconnect_callback();
        }
    }
}


// Convert coordinates
function latToDecimal(lat, dir) {
    var sign = dir === "N" ? 1 : -1;
    // DDmm.mmmm
    return (Number(lat.slice(0,2)) + (Number(lat.slice(2,9))/60)) * sign;
}
  
function longToDecimal(long, dir) {
    var sign = dir === "E" ? 1 : -1;
    // DDDmm.mmm
    return (Number(long.slice(0,3)) + (Number(long.slice(3,10))/60)) * sign;
}

function handleNewGPSData(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    
    // console.log(`Data: ${decoder.decode(value)}`);
    
    var msg = decoder.decode(value);
    // document.getElementById('status').innerText = msg+  " " + data_count;
    if (gps_data_callback) {
        // Decode lat/long RMC message
        var msg_parts = msg.split(',');
        // Positions: [0] header, [1] utc, [2] pos status, [3] lat, [4], lat dir, [5] long, [6] long dir
        if (msg_parts.length > 6) {
            if (msg_parts[2] === "A") {
                // Position is valid
                var lat = latToDecimal(msg_parts[3], msg_parts[4]);
                var long = longToDecimal(msg_parts[5], msg_parts[6]);

                gps_data_callback(lat, long);

            }
        }
    }
}


async function connectGPS() {
    // Look for the GPS device 
    try {
        gps_device = await navigator.bluetooth.requestDevice({ filters: [{ services: [BLE_SERIAL_SERVICE_UUID]}]});
        console.log("Found: ", gps_device);
    } catch (e) {
        showError("Error requesting device: " + e.toString());
        return;
    }

    gps_device.addEventListener('gattserverdisconnected', handleGPSDisconnected);

    // TODO: connection rety logic. This doesn't always work on the first try
    try {
        var server = await gps_device.gatt.connect();
        console.log("Connected! ", server);
        gps_connected = true;
        document.getElementById('connect-gps').innerHTML = "Disconnect GPS";
    } catch (e) {
        showError("Error connecting to device: " + e.toString());
        handleGPSDisconnected("reconnect");
        return;
    }

    // Access the service from the server
    try {
        var service = await server.getPrimaryService(BLE_SERIAL_SERVICE_UUID);
        console.log("Service: ", service);
    } catch (e) {
        showError("Error getting GPS service: " + e.toString());
        gps_device.gatt.disconnect();
        return;
    }

    // Access the BLE characteristic from the service
    try {
        var characteristic = await service.getCharacteristic(BLE_TX_UUID);
        console.log("got characteristic: ", characteristic);
    } catch (e) {
        showError("Error getting the characteristic: " + e.toString());
        gps_device.gatt.disconnect();
    }

    // Setup a listener for new data from the characteristic
    try {
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleNewGPSData);
    } catch (e) {
        showError("Error setting up notifications: " + e.toString());
        gps_device.gatt.disconnect();
    }

    // BLE GPS device connected and ready
    document.getElementById("gps-status").style.color="green";
    document.getElementById("gps-status").innerHTML = "public";

    // close drawer
    var selector_Id = document.querySelector('.mdl-layout');
    selector_Id.MaterialLayout.toggleDrawer();


    console.log("GPS ready!");
    if (gps_connected_callback != null) {
        gps_connected_callback();
    }
}


async function handleGPSConnectButton(e) {
    e.preventDefault();
    gps_retry_count = 0;

    if (gps_connected) {
        gps_device.gatt.disconnect();
        console.log("Disconnecting...");
        return;
    }
    await connectGPS();
}


function initGPS(new_pos_callback, connected_callback = null, disconnect_callback = null) {
    gps_data_callback = new_pos_callback;
    gps_connected_callback = connected_callback;
    gps_disconnect_callback = disconnect_callback;

    if ("bluetooth" in navigator) {
        document.getElementById('connect-gps').addEventListener('click', handleGPSConnectButton);
    } else {
        showError("No BLE support on this device!");
    }
}