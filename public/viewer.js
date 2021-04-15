window.onload = () => {

    //방송보기 버튼 클릭
    document.getElementById('my-button').onclick = () => {
        init();
    }

    //후원하기 버튼 클릭
    document.getElementById('support-button').onclick = async () => {
        //보유 금액 확인
        var user = await getUser();
        var wallet = await getWallet(user);
        if (wallet === null) { //비회원은 보유금액이 존재하지 않으므로 후원 불가능
            swal("비회원은 후원할 수 없습니다.");
            return;
        }

        swal({
                title: "보유금액",
                text: "현재 보유 금액 : " + wallet + "원",
                buttons: {
                    charge: "충전하기",
                    support: "후원하기"
                }
            })
            .then((value) => {
                if (value === "support") { //후원하기 버튼
                    swal({
                            title: "후원하기",
                            content: {
                                element: "input",
                                attributes: {
                                    placeholder: "후원할 금액을 입력하세요"
                                }
                            }
                        })
                        .then(async (value) => {
                            value = Number(value);
                            if (isNaN(value) || value <= 0) {
                                alert("정확한 숫자를 입력해 주세요");
                                return;
                            }

                            if (value > wallet) {
                                alert("보유 금액이 부족합니다.");
                                return;
                            }
                            var superWallet = await getWallet("super"); //관리자가 보유한 금액
                            var user = await getUser();
                            const socket = io();
                            let spon_msg = {
                                message: user + "님이 " + value + "원을 후원하였습니다."
                            }
                            socket.emit("spon-msg", spon_msg);
                            var result = Number(superWallet) + Number(value);
                            setWallet("super", result); //관리자에게 후원한 만큼의 금액 +
                            setWallet(user, Number(wallet) - Number(value)); //유저는 후원한 금액만큼 -

                            //후원기록에 저장

                            //서버에 후원 기록 등록 요청
                            const ajax_url = "http://localhost/backend/spon_board.php";
                            const ajax_type = "POST";
                            const ajax_data = {
                                request: "post_write",
                                board_title: value+"원",
                                board_content:"TODO",
                                board_user: user,
                            };

                            //비동기 처리 위해 await 사용, 데이터 수신
                            result = await nv_ajax(ajax_url, ajax_type, ajax_data);
                            console.log(result);
                        })
                } else if (value == "charge") { // 충전하기 버튼
                    swal({
                            title: "충전하기",
                            text: "현재 보유 금액 : " + wallet + "원",
                            text: "충전 할 금액을 입력하세요.",
                            content: "input",
                            buttons: "결제하기"
                        })
                        .then((value) => { //결제 버튼 누를시
                            price = Number(value); // String -> int 형으로 변환
                            console.log(price);
                            if (isNaN(price) || price <= 0) {
                                alert("정확한 숫자를 입력해 주세요");
                                return;
                            }

                            var IMP = window.IMP; // 생략가능
                            IMP.init('imp45279495');
                            IMP.request_pay({
                                pg: 'inicis',
                                pay_method: 'card',
                                /*
                                    'samsung':삼성페이,
                                    'card':신용카드,
                                    'trans':실시간계좌이체,
                                    'vbank':가상계좌,
                                    'phone':휴대폰소액결제
                                */
                                merchant_uid: 'merchant_' + new Date().getTime(),
                                name: '주문명:결제테스트',
                                //결제창에서 보여질 이름
                                amount: price,
                                //가격
                                buyer_email: 'iamport@siot.do',
                                buyer_name: '구매자이름',
                                buyer_tel: '010-1234-5678',
                                buyer_addr: '서울특별시 강남구 삼성동',
                                buyer_postcode: '123-456',
                                m_redirect_url: 'https://www.yourdomain.com/payments/complete'
                                /*
                                    모바일 결제시,
                                    결제가 끝나고 랜딩되는 URL을 지정
                                    (카카오페이, 페이코, 다날의 경우는 필요없음. PC와 마찬가지로 callback함수로 결과가 떨어짐)
                                */
                            }, async function (rsp) {
                                console.log(rsp);
                                if (rsp.success) {
                                    var msg = '결제가 완료되었습니다.';
                                    alert(msg);
                                    var user = await getUser(); //user id 얻어옴
                                    var result = price + Number(wallet);
                                    setWallet(user, result); //db에 결제된 값 저장
                                } else {
                                    var msg = '결제에 실패하였습니다.\n';
                                    msg += rsp.error_msg;
                                    alert(msg);
                                }
                            });
                        });
                }
            });
    }
}

async function init() {
    const peer = createPeer();
    peer.addTransceiver("video", {
        direction: "recvonly"
    });
    // peer.addTransceiver("audio", { direction: "recvonly" });
}

function createPeer() {
    console.log("createPeer()");
    const peer = new RTCPeerConnection({
        iceServers: [{
            urls: "stun:stun.stunprotocol.org"
        }]
    });
    peer.ontrack = handleTrackEvent;
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
    } = await axios.post('/consumer', payload);
    const desc = new RTCSessionDescription(data.sdp);
    peer.setRemoteDescription(desc).catch(e => console.log(e));
}

function handleTrackEvent(e) {
    document.getElementById("video").srcObject = e.streams[0];
};

init();