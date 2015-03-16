// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />
/// <reference path="outline.js" />
/// <reference path="delaunay.js" />
/// <reference path="drawFunc.js" />


$(document).ready(function () {

	// ブラウザ判定, 警告メッセージ
	var ua = window.navigator.userAgent.toLowerCase();
	var ver = window.navigator.appVersion.toLowerCase();
	if (ua.indexOf('chrome') != -1){
		// chromeはOK
	}else if (ua.indexOf('firefox') != -1){
		// firefoxはOK
	} else {
		alert("お使いのブラウザは非推奨です．推奨ブラウザは Google Chrome と Firefox です．Internet Explorer は HTML5 File API の互換性対応ができていないため，作成したデータを保存できません．");
	}

	// 2dコンテキストを取得
	var canvas = $("#mViewCanvas");
	var cvs = document.getElementById('mViewCanvas');	// イベント設定用
	var context = canvas.get(0).getContext("2d");
	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();


	// 初期状態はアウトライン作成
	var state = "drawOutLine";

	// アウトライン作成用変数
	var outline = new Outline();
	var cv = new ClosedCurve(minlen);
	var drawingFlag = true;    // 書き終わった後にクリックしなおしてから次の描画を始めるためのフラグ

	// メッシュ作成用変数
	var mesh;

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

	img.onload=function () {
		calcImgParameters();
		// キャンバスサイズ変更
		canvas.attr("width", img.width);
		canvas.attr("height", img.height);
		canvasWidth = canvas.width();
		canvasHeight = canvas.height();

		// 画像以外の変数の初期化
		state="drawOutLine";
		cv=new ClosedCurve(minlen);
		outline=new Outline();
		$("#imgCheckBox").attr("checked", true ) // 画像表示チェックを入れる

		// 画像からエッジを抽出する
		var outlineFromImg = getOutlineFromImg(canvas, img, cutoff);

		// エッジからメッシュ用の輪郭を作成する
		var vtx = outlineFromImg.vertex;
		var cn = outlineFromImg.connectivity;
		var points;
		for(var i = 0; i < cn.length; ++i) {
			points = [];
			for(var j = 0; j < cn[i].length; ++j) {
				points.push(vtx[cn[i][j]]);
			}
			cv.buildFromPoints(points);
			outline.addClosedLine(cv);
			cv = new ClosedCurve(minlen);
		}
		
		mesh = new DelaunayGen(outline, minlen);
		hideAndRemoveSaveEle();

		state = "generateMesh";
		mainloop();
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


	/////////////////////////////////////////////////////////
	/////////　メインの処理
	/////////////////////////////////////////////////////////

	var prevState = 'none';		
	function mainloop() {

		var time0 = new Date();
		var message;
		// メイン処理
		switch(state) {
			case "generateMesh":
				message = "メッシュ生成中です．（入り組んだ境界はうまく分割できないことがあります…．）";
				generateMeshFunc();
				break;
			case "meshComplete":
				message = "メッシュ生成が完了しました、「4．3D表示」で確認してください．（入り組んだ境界はうまく分割できないことがあります…．）";
				meshCompleteFunc();
				break;
			case "3dView":
				message = "厚さは詳細設定から変えることができます．これでよければ「5．保存」をクリックし，生成されたリンクから右クリックして保存してください．"
				break;
		}
		// メッセージと窓サイズ情報の反映
		$("#modeMessage").text(message);

		var time1 = new Date();
		//console.log(time1-time0 + " [ms]");


		setTimeout(mainloop, 30);
	}


	//////////////////////////////////////////////////////////
	//////  メッシュ生成処理
	//////////////////////////////////////////////////////
	function generateMeshFunc() {
		var imgFlag = $('#imgCheckBox').is(':checked');
		if(!mesh.addPoint(canvas, img, 240)) {
			// メッシュ生成が完了したら実行される処理
			mesh.meshGen(canvas, img, 240);
			state = "meshComplete";
			mesh25d = new Mesh25d(mesh.dPos, mesh.tri);
			
			$('#saveDiv').show("slow");
		}

		// 描画リセット
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvasWidth, canvasHeight);
		
		// 全体の写真を描画
		if(imgFlag) {
			context.globalAlpha = 0.7;
			context.drawImage(img, dx, dy, dw, dh);
			context.globalAlpha = 1.0;
		}

		// メッシュの描画
		context.strokeStyle='black';
		context.fillStyle='lightseagreen';
		context.globalAlpha = 0.7;
		for(var i=0; i<mesh.tri.length; ++i) {
			var tri=[mesh.tri[i][0], mesh.tri[i][1], mesh.tri[i][2]];
			if(mesh.triInOut[i]) {
				drawTri(context, mesh.dPos[tri[0]], mesh.dPos[tri[1]], mesh.dPos[tri[2]]);
			}
			drawTriS(context, mesh.dPos[tri[0]], mesh.dPos[tri[1]], mesh.dPos[tri[2]]);
		}
		context.globalAlpha = 1.0;

		// 輪郭全体の描画
		var color = 'rgb(20,20,20)';
		context.fillStyle=color;
		context.strokeStyle=color;
		for (var c = 0; c < mesh.outline.closedCurves.length; c++) {
			var cvtmp = mesh.outline.closedCurves[c];
			for (var i = 0; i < cvtmp.lines.length; ++i) {
				drawLine(context, cvtmp.lines[i].start, cvtmp.lines[i].end);
			}
		}		
	}

	//////////////////////////////////////////////////////////
	//////  メッシュ生成完了後の描画処理
	//////////////////////////////////////////////////////
	function meshCompleteFunc() {

		var imgFlag = $('#imgCheckBox').is(':checked');
	
		// 描画リセット
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvasWidth, canvasHeight);

		// 全体の写真を描画
		if(imgFlag) {
			context.globalAlpha = 0.7;
			context.drawImage(img, dx, dy, dw, dh);
			context.globalAlpha = 1.0;
		}

		// メッシュの描画
		///context.strokeStyle='gray';
		context.strokeStyle='lightseagreen';
		context.fillStyle='lightseagreen';
		if(imgFlag) {
			context.globalAlpha = 0.7;
		}
		for(var i=0; i<mesh.tri.length; ++i) {
			var tri=[mesh.tri[i][0], mesh.tri[i][1], mesh.tri[i][2]];
			drawTri(context, mesh.dPos[tri[0]], mesh.dPos[tri[1]], mesh.dPos[tri[2]]);
			drawTriS(context, mesh.dPos[tri[0]], mesh.dPos[tri[1]], mesh.dPos[tri[2]]);
		}
		if(imgFlag) {
			context.globalAlpha = 1.0;
		}

		

	}


	//////////////////////////////////////////////////////////
	//////  イベント処理
	//////////////////////////////////////////////////////
		
	// リセットボタン
	$("#resetButton").click(function () {
		cv = new ClosedCurve(minlen);
		outline = new Outline();
		state = "drawOutLine";
		hideAndRemoveSaveEle();
	});

	// 3Dビュー
	$('#3dButton').click(function(){
		state = "3dView";
		var v = $("#thicknessBox").val();
		var thickness = Number(v);
		var vert = mesh25d.getPos(mmperpixel, thickness);
		renderWebGL(canvasWidth, canvasHeight, mesh25d.modelLength, mesh25d.modelTop, mesh25d.modelBottom, vert, mesh25d.tri);
	});

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
		a.setAttribute('target', '_blank');
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
		$('#saveDiv').hide('slow');
		$('#downloadDiv').hide('slow');
	}


} );

