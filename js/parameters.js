//スライダで調整可能なグローバル変数

// スケーリング変数
var mmperpixel = 0.15;

// 画像描画関係
var dx;
var dy;
var dw;
var dh;

// 二値化閾値
var cutoff = 240;

$(document).ready(function () {

	// 出力スケーリング変数mmperpixel
	$("#scaleSlider").slider({
		min: 0.05,
		max: 0.3,
		step: 0.01,
		value: mmperpixel,
		slide: function (event, ui) {
			mmperpixel = ui.value;
			document.getElementById('scaleSpan').innerHTML = mmperpixel;
		}
	});
	document.getElementById('scaleSpan').innerHTML=mmperpixel;


	// 二値化閾値
	$("#imgThresioldSlider").slider({
		min: 0,
		max: 255,
		step: 1,
		value: cutoff,
		slide: function (event, ui) {
			cutoff = ui.value;
			document.getElementById('imgThresioldSpan').innerHTML = cutoff;
		}
	});
	document.getElementById('imgThresioldSpan').innerHTML = cutoff;

});