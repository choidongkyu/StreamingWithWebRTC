let mediaRecorder;
let recordedBlobs;
let recorder;

window.onload = () => {
    document.getElementById('my-button').onclick = () => {
        init().then(() => {
            startRecording();
        });
    }

    document.getElementById('i_login_menu').onclick = () => {
        stopRecording();
        setTimeout(function () {
            uploadVideo();
        }, 300);
    }
}

//녹화 시작 메소드
function startRecording() {
    recordedBlobs = [];
    let options = {
        mimeType: 'video/webm;codecs=vp9,opus'
    };
    try {
        mediaRecorder = new MediaRecorder(window.stream, options);
    } catch (e) {
        console.error('Exception while creating MediaRecorder:', e);
        errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
        return;
    }

    console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
    mediaRecorder.onstop = (event) => {
        console.log('Recorder stopped: ', event);
        console.log('Recorded Blobs: ', recordedBlobs);
    };
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();
    console.log('MediaRecorder started', mediaRecorder);
}

function handleDataAvailable(event) {
    console.log('handleDataAvailable', event);
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

//녹화 중지 메소드
function stopRecording() {
    mediaRecorder.stop();
}

async function init() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
    });
    window.stream = stream;
    document.getElementById("video").srcObject = stream;
    const peer = createPeer();
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
}


function createPeer() {
    const peer = new RTCPeerConnection({
        iceServers: [{
            urls: "stun:stun.stunprotocol.org"
        }]
    });
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(peer);

    return peer;
}

async function handleNegotiationNeededEvent(peer) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const payload = {
        sdp: peer.localDescription
    };

    const {
        data
    } = await axios.post('/broadcast', payload);
    const desc = new RTCSessionDescription(data.sdp);
    peer.setRemoteDescription(desc).catch(e => console.log(e));
}

function xhr(url, data) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status == 200) { //정상적으로 업로드 완료시
            console.log("uploade complete");
            location.href = "http://localhost/index.html";
        }
    };
    request.open('POST', url);
    request.send(data);
}

async function uploadVideo() {
    var today = new Date();
    var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + '-' + today.getTime();
    var fileType = 'video'; // or "audio"
    var fileName = today.getTime() + '.mp4'; // or "wav"
    const blob = new Blob(recordedBlobs, {
        type: 'video/mp4'
    });

    var formData = new FormData();
    formData.append(fileType + '-filename', fileName);
    formData.append(fileType + '-blob', blob);

    xhr('http://localhost/backend/record_upload.php', formData);
}

function download() {
    const blob = new Blob(recordedBlobs);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

// //페이지를 벗어날때 불리는 콜백
// window.addEventListener('beforeunload', async (event) => {
//     console.log("beforeunload called!");
//     event.returnValue = ''; // chrome에서는 return value 설정 필요
// })


//webrtc init
init().then(() => {
    startRecording();
});