// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />
/// <reference path="drawFunc.js" />


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

	// Check for the various File API support.
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		// Great success! All the File APIs are supported.
	} else {
		alert('The File APIs are not fully supported in this browser.');
	}

	var context1 = $("#canvas1").get(0).getContext("2d");
	var context2 = $("#canvas2").get(0).getContext("2d");
	var context3 = $("#canvas3").get(0).getContext("2d");
	var context4 = $("#canvas4").get(0).getContext("2d");
	var context5 = $("#canvas5").get(0).getContext("2d");
	var context6 = $("#canvas6").get(0).getContext("2d");

	// スライダの初期化 出力スケーリング変数mmperpixel
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
	document.getElementById('scaleSpan').innerHTML = mmperpixel;


	// スライダの初期化 二値化閾値
	$("#imgThresioldSlider").slider({
		min: 0,
		max: 255,
		step: 1,
		value: cutoff,
		slide: function (event, ui) {
			cutoff = ui.value;
			document.getElementById('imgThresioldSpan').innerHTML = cutoff;
			// 二値化
			mybinarization(context2, context3, canvasWidth, canvasHeight, cutoff);
			// 倍化
			roughen(context3, context4, canvasWidth, canvasHeight, 3);
			// マニフォルドネス復帰
			recoverManifoldness(context4, context5, canvasWidth, canvasHeight);
		},
		change: function (event, ui) {
			update();
		}
	});
	document.getElementById('imgThresioldSpan').innerHTML = cutoff;


	// 2dコンテキストを取得
	var canvas = $("#mViewCanvas");
	var context = canvas.get(0).getContext("2d");
	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();

	// メッシュ作成用変数
	var cdtResult;
	var trueTri;

	// 2.5次元メッシュ用変数
	var mesh25d;

	/////////////////////////////////
	// 画像の読み込み
	//////////////////////////////////

	var img = new Image();

	$("#uploadFile").change(function () {
		// 選択されたファイルを取得
		var file=this.files[0];
		// 画像ファイル以外は処理中止
		if(!file.type.match(/^image\/(png|jpeg|gif|bmp)$/)) return;
		var reader=new FileReader();
		// File APIを使用し、ローカルファイルを読み込む
		reader.onload=function (evt) {
			// 画像のURLをソースに設定
			img.src=evt.target.result;
		}
		// ファイルを読み込み、データをBase64でエンコードされたデータURLにして返す
		reader.readAsDataURL(file);
	});



	function handleFileSelect(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		var files = evt.dataTransfer.files; // FileList object.
		var file = files[0];
		// 画像ファイル以外は処理中止
		if(!file.type.match(/^image\/(png|jpeg|gif|bmp)$/)) return;
		var reader = new FileReader();
		// File APIを使用し、ローカルファイルを読み込む
		reader.onload = function (evt) {
			// 画像のURLをソースに設定
			img.src = evt.target.result;
		}
		// ファイルを読み込み、データをBase64でエンコードされたデータURLにして返す
		reader.readAsDataURL(file);
	}

	function handleDragOver(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
	}

	// Setup the dnd listeners.
	var dropZone = document.getElementById('page');
	dropZone.addEventListener('dragover', handleDragOver, false);
	dropZone.addEventListener('drop', handleFileSelect, false);




	img.onload = function () {

		update();

	}

	function update() {
		calcImgParameters();
		// キャンバスサイズ変更
		var size_fixed = 300;
		if(img.width > img.height) {
			scale = size_fixed / img.width;
		} else {
			scale = size_fixed / img.height;
		}
		canvasWidth = Math.floor(scale * img.width);
		canvasHeight = Math.floor(scale * img.height);
		canvas.attr("width", canvasWidth);
		canvas.attr("height", canvasHeight);

		$("#canvas1").attr("width", canvasWidth);
		$("#canvas2").attr("width", canvasWidth);
		$("#canvas3").attr("width", canvasWidth);
		$("#canvas4").attr("width", canvasWidth);
		$("#canvas5").attr("width", canvasWidth);
		$("#canvas6").attr("width", canvasWidth);
		$("#canvas1").attr("height", canvasHeight);
		$("#canvas2").attr("height", canvasHeight);
		$("#canvas3").attr("height", canvasHeight);
		$("#canvas4").attr("height", canvasHeight);
		$("#canvas5").attr("height", canvasHeight);
		$("#canvas6").attr("height", canvasHeight);

		// 入力画像の描画
		context1.drawImage(img, 0, 0, canvasWidth, canvasHeight);
		// グレースケール化
		mygrayScale(context1, context2, canvasWidth, canvasHeight);
		// 二値化
		mybinarization(context2, context3, canvasWidth, canvasHeight, cutoff);
		// 倍化
		roughen(context3, context4, canvasWidth, canvasHeight, 3);
		// マニフォルドネス復帰
		recoverManifoldness(context4, context5, canvasWidth, canvasHeight);
		// 輪郭追跡結果
		var boundary = mycontourDetection(context5, context6, canvasWidth, canvasHeight);


		/*
		console.log(boundary);
		var str = '[';
		for(var i = 0; i < boundary.length; ++i) {
			str += '[';
			for(var j = 0; j < boundary[i].length; ++j) {
				str += '[' + boundary[i][j][0] + ', ' + boundary[i][j][1] + '], ';
			}
			str += '], \n';
		}
		str += ']';
		fileSave(str, 'boundary.txt');
		*/
		/*
		trueTri = null;
		var culledBoundary = [];
		for(var bi = 0; bi < boundary.length; ++bi) {
			var boundaryToBeAdded = [];
			var len = boundary[bi].length;
			var ZERO = 1e-1;
			for(var bj = 0; bj < len; ++bj) {
				var v1 = cdt.sub(boundary[bi][bj], boundary[bi][(bj+len-1)%len]);
				v1 = cdt.div(v1, cdt.norm2(v1));
				var v2 = cdt.sub(boundary[bi][(bj+1)%len], boundary[bi][(bj+len-1)%len]);
				v2 = cdt.div(v2, cdt.norm2(v2));
				if(Math.abs(v1[0] * v2[0] + v2[1] * v2[1] - 1) > ZERO) {
					boundaryToBeAdded.push(boundary[bi][bj]);
				}
			}
			culledBoundary.push(boundaryToBeAdded);
		}
		boundary = cdt.clone(culledBoundary);
		*/

		cdtResult = cdt(boundary, [], { merge: true, softConstraint: true, cutoffLength: 0 });

		var tri = cdtResult.connectivity;
		var points = cdtResult.points;
		trueTri = [];
		for(var i = 0; i < tri.length; ++i) {
			var triCenter = numeric.add(points[tri[i][0]], points[tri[i][1]]);
			triCenter = numeric.add(triCenter, points[tri[i][2]]);
			triCenter = numeric.div(triCenter, 3);
			if(isPointBlack(triCenter, context4, canvasWidth, canvasHeight)) {
				trueTri.push(tri[i]);
			}
		}
		function isPointBlack(p, contextIn, width, height) {
			var imgData = contextIn.getImageData(0, 0, width, height);
			var pPx = [Math.floor(p[0]), Math.floor(p[1])];
			return (imgData.data[4 * (width * pPx[1] + pPx[0])] < 100);
		}

		meshCompleteFunc();



		mesh25d = new Mesh25d(cdtResult.points, trueTri);

		hideAndRemoveSaveEle();

		return;

		var v = $("#thicknessBox").val();
		var thickness = Number(v);
		var vert = mesh25d.getPos(mmperpixel, thickness);
		renderWebGL(canvasWidth, canvasHeight, mesh25d.modelLength, mesh25d.modelTop, mesh25d.modelBottom, vert, mesh25d.tri);
	}

	calcImgParameters = function(){
		dx=0;
		dy=0;
		dw=img.width;
		dh=img.height;
	}

	img.onerror=function(){
		alert("画像が読み込めません");
	}

	//////////////////////////////////////////////////////////
	//////  メッシュ生成完了後の描画処理
	//////////////////////////////////////////////////////
	function meshCompleteFunc() {
		// 描画リセット
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, 2* canvasWidth, 2*canvasHeight);
		// メッシュの描画
		///context.strokeStyle='gray';
		context.strokeStyle='gray';
		context.fillStyle='lightblue';
		//context.globalAlpha = 0.7;
		var points = cdtResult.points;
		var conn = trueTri;
		for(var i=0; i<conn.length; ++i) {
			var tri=[conn[i][0], conn[i][1], conn[i][2]];
			drawTri(context, points[tri[0]], points[tri[1]], points[tri[2]]);
			drawTriS(context, points[tri[0]], points[tri[1]], points[tri[2]]);
		}
		//context.globalAlpha = 1.0;
	}

	//////////////////////////////////////////////////////////
	//////  イベント処理
	//////////////////////////////////////////////////////
	// 保存ボタン
	$("#saveButton").click(function(){
		// ダウンロードリンクの構成
		$('#downloadDiv').hide();
		var v = $("#thicknessBox").val();
		var thickness = Number(v);
		var text = mesh25d.makeStl(mmperpixel, thickness);
		var blob = new Blob([text],{"type" : "text/html"});
		var a = document.getElementById('downloadLink');
		a.setAttribute('href', window.URL.createObjectURL(blob));
		a.setAttribute('download', '3d-model.stl');
		document.getElementById('thicknessDownload').innerHTML=thickness;
		$('#downloadDiv').show('slow');
	});

	function hideAndRemoveSaveEle() {
		// webglオブジェクトが存在する場合削除
		var oyadom = document.getElementById('webglBox');
		var webglOldDom = document.getElementById('webgl');
		if(webglOldDom) {
			oyadom.removeChild(webglOldDom);
		}
	}

} );


// グレースケール化
// canvasコンテキスト contextIn をグレースケール化して contextOut に書き出す
// ただしアルファ値が 0 のピクセルはそのままにする
function mygrayScale(contextIn, contextOut, width, height) {
	var imgData = contextIn.getImageData(0, 0, width, height);
	var gray;
	for(var i = 0; i < imgData.width * imgData.height; ++i) {
		if(imgData.data[4 * i + 3] != 0) {
			gray = 0.299 * imgData.data[4 * i] + 0.587 * imgData.data[4 * i + 1] + 0.114 * imgData.data[4 * i + 2];
			gray = Math.floor(gray);
			imgData.data[4 * i] = gray;
			imgData.data[4 * i + 1] = gray;
			imgData.data[4 * i + 2] = gray;
			imgData.data[4 * i + 3] = 255;
		}
	}
	contextOut.putImageData(imgData, 0, 0);
}
// 二値化
// canvasコンテキスト contextIn を閾値 threshold の元で二値化して contextOut に書き出す
// 入力画像はグレースケール画像であることを想定している（RGB値がすべて同じ）
// アルファ値が 0 のピクセルは閾値に関わらず白にする
function mybinarization(contextIn, contextOut, width, height, threshold) {
	var imgData = contextIn.getImageData(0, 0, width, height);
	var gray;
	for(var i = 0; i < imgData.width * imgData.height; ++i) {
		if(imgData.data[4 * i + 3] == 0) {
			imgData.data[4 * i] = 255;
			imgData.data[4 * i + 1] = 255;
			imgData.data[4 * i + 2] = 255;
			imgData.data[4 * i + 3] = 255;
		} else if(imgData.data[4 * i] < threshold) {
			imgData.data[4 * i] = 0;
			imgData.data[4 * i + 1] = 0;
			imgData.data[4 * i + 2] = 0;
			imgData.data[4 * i + 3] = 255;
		} else {
			imgData.data[4 * i] = 255;
			imgData.data[4 * i + 1] = 255;
			imgData.data[4 * i + 2] = 255;
			imgData.data[4 * i + 3] = 255;
		}
	}
	contextOut.putImageData(imgData, 0, 0);
}


function recoverManifoldness(contextIn, contextOut, width, height) {
	var imgDataIn = contextIn.getImageData(0, 0, width, height);
	// 出力に入力と同じ画像を描画しておく
	// 修正すべき部分だけ後で修正する
	contextOut.putImageData(imgDataIn, 0, 0);
	var imgDataOut = contextOut.getImageData(0, 0, width, height);
	// 読み取り用ピクセルデータ（書き換えない）
	var pixelDataIn = new Array(width);
	for(var wi = 0; wi < width; ++wi) {
		pixelDataIn[wi] = new Array(height);
		for(var hi = 0; hi < height; ++hi) {
			pixelDataIn[wi][hi] = imgDataIn.data[4 * (width * hi + wi)];
		}
	}
	// あるピクセルを * で表し、
	// 周囲のピクセルを下のように番号を付けて表す
	// 3 2 1
	// 4 * 0
	// 5 6 7
	// Freeman's chain code
	var chainCode = [
	[1, 0], [1, -1], [0, -1], [-1, -1],
	[-1, 0], [-1, 1], [0, 1], [1, 1]
	];
	var black = 0;
	var white = 255;
	// 四隅とその隣のピクセルにアクセスするインデックス配列
	var cornerIndices = [[2, 1, 0], [0, 7, 6], [6, 5, 4], [4, 3, 2]];
	for(var hi = 0; hi < height; ++hi) {
		for(var wi = 0; wi < width; ++wi) {
			// ピクセルが黒ならば何もしない
			if(pixelDataIn[wi][hi] == black) {
				continue;
			}
			// 四隅の黒・白・黒チェック
			var is_black_white_black = false;
			for(var ci = 0; ci < 4; ++ci) {
				var px_values = new Array(3);
				var is_out_of_range = false;
				for(var cj = 0; cj < 3; ++cj) {
					var x_check = wi + chainCode[cornerIndices[ci][cj]][0];
					var y_check = hi + chainCode[cornerIndices[ci][cj]][1];
					// チェックするピクセルが画像の範囲外ならば
					// そのコーナーは調べなくてよい
					if(x_check < 0 || x_check >= width || y_check < 0 || y_check >= height) {
						is_out_of_range = true;
						break;
					}
					px_values[cj] = pixelDataIn[x_check][y_check];
				}
				if(is_out_of_range) {
					continue;
				}
				if(
					px_values[0] == black
					&& px_values[1] == white
					&& px_values[2] == black
					) {
					imgDataOut.data[4 * (width * hi + wi) + 0] = 0;
					imgDataOut.data[4 * (width * hi + wi) + 1] = 0;
					imgDataOut.data[4 * (width * hi + wi) + 2] = 0;
					imgDataOut.data[4 * (width * hi + wi) + 3] = 255;
					break;
				}
			}
		}
	}
	contextOut.putImageData(imgDataOut, 0, 0);
}

// 画像を荒くする
// ローカル変数の dotsize (整数値) で粗さを指定する．大きいほど荒い．
// contextInは二値化画像であることを想定する
// dotsizeで指定したピクセル数の正方形の中で白or黒の多数派にすべて染める
function roughen(contextIn, contextOut, width, height, dotsize) {
	var imgDataIn = contextIn.getImageData(0, 0, width, height);
	var imgDataOut = contextOut.getImageData(0, 0, width, height);
	for(var wi = 0; wi < width/dotsize; ++wi) {
		for(var hi = 0; hi < height / dotsize; ++hi) {
			var sum_color = 0;
			var num_pixel_out_of_range = 0;
			for(var dwi = 0; dwi < dotsize; ++dwi) {
				for(var dhi = 0; dhi < dotsize; ++dhi) {
					if(dotsize * hi + dhi < height && dotsize * wi + dwi < width) {
						sum_color += imgDataIn.data[4 * (width * (dotsize * hi + dhi) + dotsize * wi + dwi)];
					} else {
						++num_pixel_out_of_range;
					}
				}
			}
			for(var dwi = 0; dwi < dotsize; ++dwi) {
				for(var dhi = 0; dhi < dotsize; ++dhi) {
					// out of range の時　何もしない
					if(dotsize * hi + dhi >= height || dotsize * wi + dwi >= width) {
						continue;
					}
					// 白が過半数以上なら白に
					//if(sum_color > 255 * (dotsize * dotsize - num_pixel_out_of_range) / 2) {
					if(sum_color == 255 * (dotsize * dotsize - num_pixel_out_of_range) ) {
						imgDataOut.data[4 * (width * (dotsize * hi + dhi) + dotsize * wi + dwi) + 0] = 255;
						imgDataOut.data[4 * (width * (dotsize * hi + dhi) + dotsize * wi + dwi) + 1] = 255;
						imgDataOut.data[4 * (width * (dotsize * hi + dhi) + dotsize * wi + dwi) + 2] = 255;
						imgDataOut.data[4 * (width * (dotsize * hi + dhi) + dotsize * wi + dwi) + 3] = 255;
					} else {
						imgDataOut.data[4 * (width * (dotsize * hi + dhi) + dotsize * wi + dwi) + 0] = 0;
						imgDataOut.data[4 * (width * (dotsize * hi + dhi) + dotsize * wi + dwi) + 1] = 0;
						imgDataOut.data[4 * (width * (dotsize * hi + dhi) + dotsize * wi + dwi) + 2] = 0;
						imgDataOut.data[4 * (width * (dotsize * hi + dhi) + dotsize * wi + dwi) + 3] = 255;
					}
				}
			}
		}
	}
	contextOut.putImageData(imgDataOut, 0, 0);
}

// 輪郭追跡を行い，輪郭部のみに色を出力する
function mycontourDetection(contextIn, contextOut, width, height) {
	var imgData = contextIn.getImageData(0, 0, width, height);
	// 読み取り用ピクセルデータ（書き換えない）
	var pixelData = new Array(width);
	for(var i = 0; i < width; ++i) {
		pixelData[i] = new Array(height);
		for(var j = 0; j < height; ++j) {
			pixelData[i][j] = imgData.data[4 * (width * j + i)];
		}
	}
	// 更新用ピクセルデータ
	var buf = new Array(width);
	for(var i = 0; i < width; ++i) {
		buf[i] = new Array(height);
		for(var j = 0; j < height; ++j) {
			buf[i][j] = 255;
		}
	}
	// あるピクセルを * で表し、
	// 周囲のピクセルを下のように番号を付けて表す
	// 3 2 1
	// 4 * 0
	// 5 6 7
	var nextCode = [7, 7, 1, 1, 3, 3, 5, 5];
	// Freeman's chain code
	var chainCode = [
	[1, 0], [1, -1], [0, -1], [-1, -1],
	[-1, 0], [-1, 1], [0, 1], [1, 1]
	];
	var rel; // relativee pisition
	var relBuf; // previous rel
	var dPx = []; // detected pixel 輪郭として検出されたピクセルのテンポラリー変数
	var startPx = []; // 輪郭追跡の開始ピクセル
	var sPx = []; // searching pixel
	var isClosed = false; // 輪郭が閉じていれば true
	var isStandAlone; // 孤立点ならば true
	var pxs = []; // 輪郭のピクセル座標の配列を格納するテンポラリー配列
	var boundaryPxs = []; // 複数の輪郭を格納する配列
	var pxVal; // 着目するピクセルの色
	var duplicatedPx = []; // 複数回、輪郭として検出されたピクセル座標を格納（将来的にこのような重複を許さないアルゴリズムにしたい）
	while(1) {
		// 輪郭追跡開始ピクセルを探す
		dPx = searchStartPixel();
		// 画像全体が検索された場合はループを終了
		if(dPx[0] == width && dPx[1] == height) {
			break;
		}
		pxs = [];
		pxs.push([dPx[0], dPx[1]]);
		startPx = [dPx[0], dPx[1]];
		isStandAlone = false;
		isClosed = false;
		relBuf = 5; // 最初に調べるのは5番
		// 輪郭が閉じるまで次々に周囲のピクセルを調べる
		while(!isClosed) {
			for(var i = 0; i < 8; ++i) {
				rel = (relBuf + i) % 8; // relBufから順に調べる
				sPx[0] = dPx[0] + chainCode[rel][0];
				sPx[1] = dPx[1] + chainCode[rel][1];
				// sPx が画像上の座標外ならば白として評価する
				if(sPx[0] < 0 || sPx[0] >= width || sPx[1] < 0 || sPx[1] >= height) {
					pxVal = 255;
				} else {
					pxVal = pixelData[sPx[0]][sPx[1]]
				}
				// もし調べるピクセルの色が黒ならば新しい輪郭とみなす
				// 最初のピクセルに戻れば次の輪郭を探す
				// 周囲の8ピクセルがすべて白ならば孤立点なので次の輪郭を探す
				if(pxVal == 0) {
					// 検出されたピクセルが輪郭追跡開始ピクセルならば
					// 追跡を終了して次の輪郭に移る
					if(sPx[0] == startPx[0] && sPx[1] == startPx[1]) {
						isClosed = true;
						break;
					}
					// すでに検出されているピクセルだった場合，
					// ログを残す
					if(buf[sPx[0]][sPx[1]] == 0) {
						duplicatedPx.push([sPx[0], sPx[1]]);
					}

					buf[sPx[0]][sPx[1]] = 0; // 検出された点を黒にする
					dPx[0] = sPx[0];
					dPx[1] = sPx[1];
					pxs.push([dPx[0], dPx[1]]);
					relBuf = nextCode[rel];
					break;
				}
				if(i == 7) {
					isStandAlone = true;
				}
			}
			if(isStandAlone) {
				break;
			}
		}
		if(!isStandAlone) {
			boundaryPxs.push(pxs);
		} 
	}
	// 左上から操作し開始点（白から黒に代わるピクセル）を見つける
	function searchStartPixel() {
		var idx;
		var x, y;
		var leftPx;
		for(y = 0; y < height; ++y) {
			for(x = 0; x < width; ++x) {
				if(x == 0) {
					leftPx = 255;
				} else {
					leftPx = pixelData[x - 1][y];
				}
				if(leftPx == 255 && pixelData[x][y] == 0 && buf[x][y] == 255) {
					buf[x][y] = 0;
					return [x, y];
				}
			}
		}
		return [width, height];
	}
	// bufの可視化をしたいとき下のコメントアウトをはずす
	for(var i=0; i<height; ++i) {
	for(var j=0; j<width; ++j) {
	idx=width*i+j;
	imgData.data[4*idx]=buf[j][i];
	imgData.data[4*idx+1]=buf[j][i];
	imgData.data[4*idx+2]=buf[j][i];
	}
	}
	for(var i=0; i<duplicatedPx.length; ++i) {
	idx=width*duplicatedPx[i][1]+duplicatedPx[i][0];
	imgData.data[4*idx]=255;
	imgData.data[4*idx+1]=0;
	imgData.data[4*idx+2]=0;
	}
	contextOut.putImageData(imgData, 0, 0);

	// 輪郭ごとに色を変えて描画する
	/*
	contextOut.clearRect(0, 0, width, height);
	colors = ['red', 'green', 'blue', 'orange', 'purple', 'cyan'];
	colors = ['black'];
	for(var i = 0; i < boundaryPxs.length; ++i) {
		contextOut.strokeStyle = colors[i % colors.length];
		contextOut.beginPath();
		contextOut.moveTo(boundaryPxs[i][0][0], boundaryPxs[i][0][1]);
		for(var j = 1; j < boundaryPxs[i].length; ++j) {
			contextOut.lineTo(boundaryPxs[i][j][0], boundaryPxs[i][j][1]);
		}
		contextOut.lineTo(boundaryPxs[i][0][0], boundaryPxs[i][0][1]);
		contextOut.stroke();
	}
	contextOut.strokeStyle = 'black';
	*/
	return boundaryPxs;
}



function fileSave(text, filename) {
	var blob = new Blob([text], { "type": "text/html" });
	var newElement = document.createElement("a");
	newElement.textContent = "download";
	newElement.setAttribute('href', window.URL.createObjectURL(blob));
	newElement.setAttribute('download', filename);
	document.body.appendChild(newElement);
}