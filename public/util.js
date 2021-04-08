// 서버와 ajax로 통신하기 위한 함수
function nv_ajax(ajax_url, ajax_type, ajax_data) {
    return new Promise((res, rej) => {
        $.ajax({
            // 클라이언트가 요청을 보낼 서버의 URL 주소
            url: ajax_url,
            //http 요청 방식(GET,POST)
            method: ajax_type,
            // HTTP 요청과 함께 서버로 보낼 데이터
            data: ajax_data,
            // 서버에서 보내줄 데이터의 타입, 외부 서버에서 세션 얻어오므로 jsonp를 사용
            dataType: "jsonp",
            jsonp: "callback",
            // 통신이 성공적으로 이루어졌을때 이 메소드를 타게 된다
            success: function (data) {
                // 데이터 요청에 대한 응답값
                res(data);
            },
            // 통신이 실패했어도 완료되면 이 메소드를 타게됨
            error: function (request, status, error) {
                rej(new Error(error));
            },
        });
    })
}

async function getUser() {
    //session이 존재하는지 서버에 요청
    const ajax_url = "http://localhost/backend/session.php";
    const ajax_type = "GET";
    const ajax_data = {
        exSession: "exSession"
    };

    //비동기 처리 위해 await 사용, 데이터 수신
    var result = await nv_ajax(ajax_url, ajax_type, ajax_data);
    //관리자인 경우 result가 super로 옴
    return result['user'];
}

//비동기 처리위하여 async 익명함수로 구현
(async function () {
    var user = await getUser();
    if (user == "null") { //비회원인 경우 user의 값은 null
        user = "비회원";
    } else if (user == "super") {
        user = "관리자";
    }
    $(() => {
        const socket = io();
        let enter_msg = {
            message: user + "님이 입장하셨습니다."
        }
        socket.emit("enter-msg", enter_msg);

        $('form').submit(() => {
            let msg = {
                name: user,
                messege: $('#msg').val()
            }
            socket.emit('chat-msg', msg);
            $('#msg').val('');
            return false;
        });

        socket.on('chat-msg', (msg) => {
            $('#chatView').append($('<li>').text(msg.name + '  :  ' +
                msg.messege));
        });

        socket.on('enter-msg', (msg) => {
            $('#chatView').append($('<li style="color:green; background-color:yellow; text-align: center;">').text(msg.message));
        })
    });
}());