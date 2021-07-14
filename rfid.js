// 
// Webhid
// 
function hidReportHandler(event) {
    event.preventDefault();
    const { data, device, reportId } = event;
    // console.log(data);

    var rfid_tag = "";
    //  I ddin't figure out the entire protocol of the TW1900 UHF reader, 
    //  but it seems like the proper tag id is consitently in these 12 bytes:
    for (let x=19 ; x< 31; x++) {
        var code = data.getUint8(x);
        rfid_tag += code.toString(16).toUpperCase().padStart(2, "0");
    }
    // console.log(`RFID Tag: ${rfid_tag}`);
    
    // populate the input field and trigger the action.
    if (rfid_callback !== null) {
        rfid_callback(rfid_tag);
    }
}

async function openHidRFID() {
    // Prompt user to enable hid reader
    const device_list = await navigator.hid.getDevices();
    // console.log(device_list)

    let device = device_list.find(d => d.vendorId == VENDOR_ID && d.productId == PRODUCT_ID && d.collections.length > 0);

    if (!device) {
        // this returns an array now
        let devices = await navigator.hid.requestDevice({
            filters: [{ VENDOR_ID, PRODUCT_ID }],
        });
        // console.log("devices:",devices);
        device = devices.find(d => d.vendorId == VENDOR_ID && d.productId == PRODUCT_ID && d.collections.length > 0);
        if( !device ) {
            showError("No compatible reader found");
            document.getElementById("rfid-status").style.color="red";
            return;
        }
    }

    if (!device.opened) {
        try {
            await device.open();
            document.getElementById("rfid-status").style.color="green";
        } catch (e) {
            showError(e.toString());
            document.getElementById("rfid-status").style.color="red";
            return;
        }
    }
    device.addEventListener("inputreport", hidReportHandler);
}

async function handleReaderConnectButton(e) {
    e.preventDefault();
    await openHidRFID();

    // hacky: close the drawer
    var layout = document.querySelector('.mdl-layout');
    layout.MaterialLayout.toggleDrawer();
}

async function handleHidConnect(e) {
    await openHidRFID();
}

async function handleHidDisconnect(e) {
    document.getElementById("rfid-status").style.color="red";
}

function initHidRFID(callback) {
    if ("hid" in navigator) {
        rfid_callback = callback;
        document.getElementById('reader-connect').addEventListener('click', handleReaderConnectButton);
        navigator.hid.addEventListener("connect", handleHidConnect);
        navigator.hid.addEventListener("disconnect", handleHidDisconnect);

    } else {
        console.log("no hid device support");
        return;
    }
}