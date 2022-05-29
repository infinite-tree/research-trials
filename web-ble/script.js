// Bluetooth LE GATT UUIDs for the Nordic UART profile
const BLE_SERIAL_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
var connected = false;
var device = null;

function handleError(msg, error) {
    console.log(msg, error);
    alert(msg + error.message);
}

function handleBLEDisconnected(event) {
    console.log("BLE disconnected");
    connected = false;
    device = null;
    document.getElementById('status').innerText = "Disconnected";

}

function handleNewData(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    console.log(`Data: ${decoder.decode(value)}`);
    var msg = decoder.decode(value);
    // if (msg) {
    //     document.getElementById('status').innerText = msg;
    // }
    document.getElementById('status').innerText = msg;

}

async function handleConnectButton(e) {
    e.preventDefault();

    if (connected) {
        device.gatt.disconnect();
        return;
    }

    document.getElementById('status').innerText = "Connecting...";


    try {
        device = await navigator.bluetooth.requestDevice({ filters: [{ services: [BLE_SERIAL_SERVICE_UUID]}]});
        console.log("Found: ", device);
    } catch (e) {
        handleError("Error requesting device: ", e);
    }

    device.addEventListener('gattserverdisconnected', handleBLEDisconnected);

    // TODO: connection rety logic. This doesn't always work on the first try
    try {
        var server = await device.gatt.connect();
        console.log("Connected! ", server);
        connected = true;
        document.getElementById('ble-connect').innerText = "Disconnect";
        document.getElementById('status').innerText = "Connected";


    } catch (e) {
        handleError("Error connecting to device: ", e);
    }

    try {
        var service = await server.getPrimaryService(BLE_SERIAL_SERVICE_UUID);
        console.log("Service: ", service);
    } catch (e) {
        handleError("Error getting service: ", e);
        device.gatt.disconnect();
    }

    try {
        var characteristic = await service.getCharacteristic(BLE_TX_UUID);
        console.log("got characteristic: ", characteristic);
    } catch (e) {
        handleError("Error getting the characteristic: ", e);
        device.gatt.disconnect();
    }

    try {
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleNewData);
    } catch (e) {
        handleError("Error setting up notifications: ", e);
        device.gatt.disconnect();
    }

    // try {
    //     var value = await characteristic.readValue();
    //     console.log("Got value: ", value);
    // } catch (e) {
    //     console.log("Error reading value: ", e);
    //     device.gatt.disconnect();
    // }
}

// async function handleHidConnect(e) {
//     await openHidRFID();
// }

// async function handleHidDisconnect(e) {
//     document.getElementById("rfid-status").style.color="red";
// }

function initBLESerial() {
    if ("bluetooth" in navigator) {
        document.getElementById('ble-connect').addEventListener('click', handleConnectButton);
    } else {
        handleError("No BLE support");
    }
}

// on document load
window.addEventListener('load', function () {
    initBLESerial();
});