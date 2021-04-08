const express = require('express');
const app = express();
//Data를 파싱하기 위한 body parser 객체 생성
const bodyParser = require('body-parser');
//webrtc 라이브러리 객체
const webrtc = require("wrtc");

const server = require('http').createServer(app);

//http server를 socket io 서버로 업그레이드
const io = require('socket.io')(server);

let senderStream;

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//시청자로부터 오는 data
app.post("/consumer", async ({
    body
}, res) => {
    const peer = new webrtc.RTCPeerConnection({
        iceServers: [{
            urls: "stun:stun.stunprotocol.org"
        }]
    });
    //클라이언트로 부터 post로 sdp offer를 전달받음
    const desc = new webrtc.RTCSessionDescription(body.sdp);
    await peer.setRemoteDescription(desc);
    //broadcaster의 video트랙 전달
    senderStream.getTracks().forEach(track => {
        peer.addTrack(track, senderStream)
    });
    //sdb answer 생성
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    const payload = {
        sdp: peer.localDescription
    }
    //sdp answer 전달
    res.json(payload);
});

//broadcaster로 부터 오는 data
app.post('/broadcast', async ({body}, res) => {
    const peer = new webrtc.RTCPeerConnection({
        iceServers: [{
            urls: "stun:stun.stunprotocol.org"
        }]
    });
    peer.ontrack = (e) => handleTrackEvent(e, peer);
    const desc = new webrtc.RTCSessionDescription(body.sdp);
    await peer.setRemoteDescription(desc);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    const payload = {
        sdp: peer.localDescription
    }

    res.json(payload);
});

function handleTrackEvent(e, peer) {
    senderStream = e.streams[0];
};

//웹소켓 채팅 로직
io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        console.log("유저 나감");
    })

    socket.on('chat-msg', (msg) => {
        io.emit('chat-msg', msg);
    })

    socket.on('enter-msg', (msg) => {
        console.log(msg.message);
        io.emit('enter-msg', msg);
    })
})


server.listen(5000, () => console.log('server started:5000'));