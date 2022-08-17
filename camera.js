var camera_screen = document.getElementById("camera-screen");
var video = document.getElementById("video-feed");
var camera_stream = null;
var camera_canvas = document.getElementById("camera-canvas");

const CAMERA_WIDTH = 900;
const CAMERA_HEIGHT = 1600;

// User supplied
var photo_handler_callback = null;

// 
// Camera functions
//
async function startCamera(width, height) {
    var camera_constraints = {
      audio: false,
      video: {
        width: {min: CAMERA_WIDTH, ideal: CAMERA_WIDTH, max: CAMERA_HEIGHT},
        height: {min: CAMERA_WIDTH, ideal: CAMERA_HEIGHT, max: CAMERA_HEIGHT},
        facingMode: "environment"
      }
    };

    try {
        camera_stream = await navigator.mediaDevices.getUserMedia(camera_constraints);
        video.srcObject = camera_stream;
        camera_stream.getTracks().forEach(track=> {
            console.log(track.getSettings());
        });
        video.play();
        video.onplay = function() {
            // unhide the camera UI
            camera_screen.hidden = false;
            // FIXME: set width and height to screen size
        };
    }
    catch (e) {
        showError(e);
        return;
    }

};

function stopCamera() {
    video.pause();
    camera_stream.getTracks().forEach(track => {
        track.stop();
    });
}

async function startCameraHandler(e) {
    e.preventDefault();

    startCamera(CAMERA_WIDTH, CAMERA_HEIGHT);
}

function exitCameraHandler(e) {
    e.preventDefault();

    stopCamera();
    camera_screen.hidden = true;
}

function takePhotoHandler(e) {
    e.preventDefault();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0,0);
    
    stopCamera();
    var img_url = canvas.toDataURL('image/png');
    photo_handler_callback(img_url);
}

function initCamera(photo_callback) {
    photo_handler_callback = photo_callback;

    // Support desktop and mobile
    if(!navigator.getUserMedia){
        showError("Your browser doesn't support camera access");
        return;
    }

    camera_screen.hidden = true;
    document.getElementById("new-photo-btn").addEventListener('click', startCameraHandler);
    document.getElementById("exit-camera").addEventListener('click', exitCameraHandler);
    document.getElementById("take-photo").addEventListener('click', takePhotoHandler);
}

