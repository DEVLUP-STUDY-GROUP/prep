// 환경별 API URL (상용: /api, 로컬/개발서버: /prep/api)
const API_BASE_URL = (window.location.hostname === 'prep.event-promotion.co.kr')
    ? '/api'
    : '/prep/api';

/**
 * Form 데이터 serialize화
 */
 jQuery.fn.serializeObject = function() { 
	var obj = null; 
	try { 
		if ( this[0].tagName && this[0].tagName.toUpperCase() == "FORM" ) { 
			var arr = this.serializeArray();
			if ( arr ) { 
				obj = {};
				jQuery.each(arr, function() {
					obj[this.name] = this.value;
				});
			}
		}
	} catch(e) {
		alert(e.message);
	} finally {}
	return obj;
};

/**
 * 숫자 체크
 * @param : string
 * @return : boolean
 * */
function fn_number_chk(str){
	return /[^0123456789]/g.test(str) ? false : true;
}

/**
 * 이메일 체크
 * @param : string
 * @return : boolean
 * */
function fn_mail_chk(str){
	// return /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i.test(str);
	return /^([0-9a-zA-Z_\.-]+)@([0-9a-zA-Z_-]+)(\.[0-9a-zA-Z_-]+){1,2}$/.test(str);
}

/**
 * ajax Call
 * @param  : url 호출 URL 정보
 * @param  : param data에 보내줄 변수 정보
 * @param  : loadingYn 로딩화면 사용 여부
 * @param  : sucHandler 성공 시 처리 함수
 * @param  : jsonYn json 여부
 */
function ajaxCall(url, data, loadingYn, jsonYn, sucHandler){
	var $loading = $('<div style="position:fixed; left:0; top:0; z-index:9999; width:100%; height:100%; background:#000; opacity:0.6; filter:alpha(opacity="60")"></div>').appendTo(document.body).hide();

//	var nullNode =_ck.checkNull();
//	if(nullNode){
//		alert('필수값은 반드시 입력해 주세요');
//		nuuNode.focus();
//	}

	$.ajax({
		type    : "POST",
		cache : false,
		url   : url,
		crossDomain: true,
		dataType: jsonYn ? "json" : "text",
		data  : jsonYn ? JSON.stringify(data) : data,
		contentType : jsonYn ? "application/json; charset=utf-8" : "application/x-www-form-urlencoded; charset=UTF-8",
		beforeSend: function() {
			if(loadingYn){
				$loading.show().fadeIn('fast');
			}
		},
		success : function (result) {
//        	console.log("ajaxCall.success.result");
        	console.log(result);
			sucHandler(result);
		},
		complete: function(status){
//        	console.log("ajaxCall.complete.status");
        	console.log(status);
			if(loadingYn){
				$loading.fadeOut();
			}
		},
		error: function(data) {
			console.log(data);
			alert("죄송합니다. 잠시 후에 이용해주세요.");
		}
	});
}

/**
 * Ajax 후 데이터 가공 처리
 * @param : result 데이터
 */
function sucHandler(result) {
	if(result.length == 0 || result.resultCd != "S"){
		alert(result.resultMsg);
	}else{
		// 등록 & 수정인 경우
		alert(result.resultMsg);
		// callAjaxList("1");
		// $("#" + result.resultType).modal('hide');
	}
}

/**
 * 클래스명 토글
 * @param : element
 * @param : className
 */
function toggleClass(element,className) {
    const check = new RegExp("(\\s|^)" + className + "(\\s|$)");
    if (check.test(element.className)) {
      element.className = element.className.replace(check, " ").trim();
    } else {
    	element.className += " " + className;
    }
}