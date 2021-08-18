var camera_screen = document.getElementById("camera-screen");
var video = document.getElementById("video-feed");
var camera_canvas = document.getElementById("canvas");


// 
// Camera functions
//
async function startCamera(width, height) {
    var camera_constraints = {
      audio: false,
      video: {
        width: {ideal: width},
        height: {ideal: height},
        facingMode: "environment"
      }
    };

    try {
        var stream = await navigator.mediaDevices.getUserMedia(camera_constraints);
        video.src = window.URL.createObjectURL(stream);
        video.play();
        video.onplay = function() {
            // unhide the camaer UI
            camera_screen.hidden = false;
        };
    }
    catch (e) {
        showError(e);
        return;
    }

};

function stopCamera() {
    // TODO: implement

    camera_screen.hidden = true;
}

function takePhotoHandler(e) {
    // FIXME: implement
}

function initCamera() {
    if(!navigator.getMedia){
        showError("Your browser doesn't support camera access");
        return;
    }

    camera_screen.hidden = true;
    document.getElementById("new-photo-btn").addEventListener('click', startCamera);
    document.getElementById("exit-camera").addEventListener('click', stopCamera);
    document.getElementById("take-photo").addEventListener('click', takePhotoHandler);
}

