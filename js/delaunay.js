// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />
/// <reference path="outline.js" />


//////////////////////////////////////////////////////
//// 外接円クラス
//////////////////////////////////////////////////////
function Circumcircle(p1,p2,p3){
	this.p1 = numeric.mul(p1,1);
	this.p2 = numeric.mul(p2,1);
	this.p3 = numeric.mul(p3,1);
	this.a = this.len(this.p2,this.p3);
	this.b = this.len(this.p3,this.p1);
	this.c = this.len(this.p1,this.p2);
	this.s = (this.a+this.b+this.c)*0.5;
	this.S = this.calcTriArea();
	this.rad = this.calcRad();
	this.p = this.calcCenter();
}

Circumcircle.prototype.len = function(p1, p2){
	var r = numeric.sub(p1,p2);
	var len = numeric.norm2(r);
	return len;
}

Circumcircle.prototype.calcTriArea = function(){
	var area = Math.sqrt(this.s * (this.s - this.a) * (this.s - this.b) * (this.s - this.c));
	return area;
}

Circumcircle.prototype.calcRad = function(){
	return ( this.a * this.b * this.c ) / ( 4.0 * this.S);
}

Circumcircle.prototype.calcCenter = function(){
	var tmp1 = this.a * this.a * ( this.b * this.b + this.c * this.c - this.a * this.a );
	var tmpv1 = numeric.mul(tmp1,this.p1);
	
	var tmp2 = this.b * this.b * ( this.c * this.c + this.a * this.a - this.b * this.b );
	var tmpv2 = numeric.mul(tmp2,this.p2);
	
	var tmp3 = this.c * this.c * ( this.a * this.a + this.b * this.b - this.c * this.c );
	var tmpv3 = numeric.mul(tmp3,this.p3);
	
	var p;
	p = numeric.add(tmpv1,tmpv2);
	p = numeric.add(p, tmpv3);
	p = numeric.div(p, 16*this.S*this.S);
	return p;		
}


//////////////////////////////////////////////////////
//// ドロネー分割クラス
//////////////////////////////////////////////////////
function DelaunayGen(outline, size){

	this.outline = outline;
	this.size = size;
	this.step = 0;
	this.pos = new Array();	// 点の数 x 2(x,y)
	this.dPos = new Array();	// 動的に変わる点
	this.tri = new Array();	// 三角形の数 x 3(三角形頂点の点番号)
	this.boundary = []; // 頂点が境界かどうかの判別フラグ 0 or 1
	this.triInOut = []; // triに対応する三角形が輪郭の内側ならばtrueを格納する配列
	this.init();
	this.bigTri();
	
}

// ドロネー分割クラス
// pos, boudary初期化メソッド
DelaunayGen.prototype.init = function(){

	// 境界上の点の追加
	for(var i=0; i<this.outline.closedCurves.length; i++) {
		for(var j=0; j<this.outline.closedCurves[i].lines.length; j++) {
			var p = numeric.mul(this.outline.closedCurves[i].lines[j].start,1);
			this.pos.push(p);
			this.boundary.push(1);
		}
	}

	// 境界内部の点の追加
	/*
	var width = this.outline.xmax - this.outline.xmin
	var height = this.outline.ymax - this.outline.ymin
	var x0 = this.outline.xmin;
	var y0 = this.outline.ymin;
	var divx = ~~(width /this.size);
	var divy = ~~(height / this.size);
	for (var i = 0; i < divy+2; i++) {
		for (var j = 0; j < divx+2; j++) {
			var x = x0+this.size*j;
			var y = y0+this.size*i;
			if(this.outline.pointInOrOut([x, y], "radius")) {
				this.pos.push([x, y]);
				this.boundary.push(0);
			}
		}
	}
	*/

}


// ドロネー分割クラス
// tri初期化メソッド
DelaunayGen.prototype.bigTri = function(){
	var margin;
	if(this.outline.xmax-this.outline.xmin>this.outline.ymax-this.outline.ymin) {
		margin=this.outline.xmax-this.outline.xmin;
	} else {
		margin=this.outline.ymax-this.outline.ymin;
	}
	var xmin = this.outline.xmin-margin;
	var xmax = this.outline.xmax+margin;
	var ymin = this.outline.ymin-margin;
	var ymax = this.outline.ymax+margin;
	// 下の点
	this.dPos.push([(xmax+xmin)*0.5, ymin-(xmax-xmin)*0.5*1.73205080757]);
	// 上の点1
	this.dPos.push([(xmax+xmin)*0.5-(xmax-xmin)*0.5-(ymax-ymin)/1.73205080757, ymax]);
	// 上の点2
	this.dPos.push([(xmax+xmin)*0.5+(xmax-xmin)*0.5+(ymax-ymin)/1.73205080757, ymax]);
	var triTmp = [0,1,2];
	this.tri.push(triTmp);
	this.finishedFlag = false;
	this.boundary.push(0);
	this.boundary.push(0);
	this.boundary.push(0);
}



// ドロネー分割クラス
// 点の追加	
DelaunayGen.prototype.addPoint = function(canvas, img, cutoff){

	var context = canvas.get(0).getContext("2d");
	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();
	context.setTransform(1,0,0,1,0,0);
	context.clearRect(0, 0, canvasWidth, canvasHeight);
	context.drawImage(img, dx, dy, dw, dh);
	var imgData = context.getImageData(0,0,canvasWidth,canvasHeight);

			
	// すべての入力点が追加されていたら
	// 何もせず終了
	if(this.step>=this.pos.length) return false;
	
	// 新しい入力点を追加
	p = this.pos[this.step];
	this.dPos.push(p);
	
	// すべての三角形について入力点が
	// 外接円に入っているかどうか調べる
	var focusedTri = [];
	
	for(var i=0; i<this.tri.length; i++){
		var c = new Circumcircle(
						this.dPos[this.tri[i][0]],
						this.dPos[this.tri[i][1]],
						this.dPos[this.tri[i][2]]
					);
		
		var distVec = numeric.sub(c.p, p);
		var dist = numeric.norm2(distVec);
		
		if(dist < c.rad	){
			// 外接円が入力点を内包する
			// 三角形を記録する
			focusedTri.push(i);
		}
	}

	focusedTri.sort(
		function(val1,val2){
			return val2 - val1;
		}
	);
	
	var points = [];
	for(var i=0; i<focusedTri.length; i++){
		// 点の抽出
		for(var j=0; j<3; j++){
			var newPoint = this.tri[focusedTri[i]][j];
			var dupFlag = false;
			for(var k=0; k<points.length; k++){
				if(points[k]==newPoint) {
					dupFlag = true;
					break;
				}
			}
			if(!dupFlag){
				points.push(newPoint);
			}
		}
		// 三角形リストからの削除
		this.tri.splice(focusedTri[i],1);
	}
	
	// 点の並べ替え
	var dPosTmp = numeric.clone(this.dPos);
	points.sort(
		function(val1, val2){
			th1 = Math.atan2(dPosTmp[val1][1]-p[1],dPosTmp[val1][0]-p[0]);
			th2 = Math.atan2(dPosTmp[val2][1]-p[1],dPosTmp[val2][0]-p[0]);
			return th2 - th1;
		}
	);
	
	// 三角形リストへの追加
	for(var i=0; i<points.length; i++){
		var newTri = [points[i], points[(i+1)%points.length], this.dPos.length-1];
		this.tri.push(newTri);
	}
	
	// triInOutの作成
	this.triInOut = numeric.linspace(0,0,this.tri.length);
	/*
	var isPointIn;
	var idx, toumei, shiro, x, y;
	for(var i=0; i<this.tri.length; i++){
		var tricenter = numeric.add(this.dPos[(this.tri[i][0])], this.dPos[(this.tri[i][1])]);
		tricenter = numeric.add(tricenter, this.dPos[this.tri[i][2]]);
		tricenter = numeric.div(tricenter, 3);
		x = Math.floor(tricenter[0]);
		y = Math.floor(tricenter[1]);
		if(x < 0 || x >= imgData.width || y < 0 || y >= imgData.height) {
			isPointIn = false;
		} else {
			idx = imgData.width*y+x;
			toumei = (imgData.data[4*idx+3]=== 0);
			shiro = (imgData.data[4*idx] > cutoff &&	imgData.data[4*idx+1] > cutoff && imgData.data[4*idx+2] > cutoff);
			isPointIn = !(toumei || shiro);
		}
		this.triInOut.push(isPointIn);
	}
	*/
	
	this.step++;
	return true;
}

DelaunayGen.prototype.meshGen = function(canvas, img, cutoff){

	// 完了しているならば実行しない
	if(this.finishedFlag)
		return;

	// すべての入力点が追加されるまで実行
	while(1){
		if(!this.addPoint(canvas, img, cutoff))
			break;
	}

	var context = canvas.get(0).getContext("2d");
	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();
	context.setTransform(1,0,0,1,0,0);
	context.clearRect(0, 0, canvasWidth, canvasHeight);
	context.drawImage(img, dx, dy, dw, dh);
	var imgData = context.getImageData(0,0,canvasWidth,canvasHeight);
	
	// 輪郭の外側の三角形を削除する
	var remTri = [];
	this.triInOut = [];
	var isPointIn;
	var idx, toumei, shiro, x, y;
	for(var i=0; i<this.tri.length; i++){
		var tricenter = numeric.add(this.dPos[(this.tri[i][0])], this.dPos[(this.tri[i][1])]);
		tricenter = numeric.add(tricenter, this.dPos[this.tri[i][2]]);
		tricenter = numeric.div(tricenter, 3);
		this.triInOut.push(this.outline.pointInOrOut(tricenter));

		x = Math.floor(tricenter[0]);
		y = Math.floor(tricenter[1]);
		if(x < 0 || x >= imgData.width || y < 0 || y >= imgData.height) {
			isPointIn = false;
		} else {
			idx = imgData.width*y+x;
			toumei = (imgData.data[4*idx+3]=== 0);
			shiro = (imgData.data[4*idx] > cutoff &&	imgData.data[4*idx+1] > cutoff && imgData.data[4*idx+2] > cutoff);
			isPointIn = !(toumei || shiro);
		}
		if(!isPointIn) {
			remTri.push(i);
		}
	}

	// 削除三角リストを大きい順に並べ替える
	remTri.sort(
		function(val1,val2){
			return val2-val1;
		}
	);		
	// 削除を実行する
	for(var i=0; i<remTri.length; i++){
		this.tri.splice(remTri[i],1);
	}
	
	// 最初に作った大きい三角形の頂点を削除する
	this.dPos.splice(0,3);
	// dPosを削除した分、全体から3引く
	this.tri = numeric.sub(this.tri,3);
	// 完了フラグをオンにする
	this.finishedFlag = true;
}

// ドロネー分割クラス
// ラプラシアン平滑化
DelaunayGen.prototype.laplacianSmoothing = function(){
	// 計算の途中結果はposTmpに格納する
	var posTmp = numeric.mul(this.dPos,1);
	// すべての頂点についてループを回す
	for(var i=0; i<this.dPos.length; i++){
		// 境界の頂点には処理を行わない
		if(this.boundary[i] == 1) continue;
		// ある頂点の隣の頂点の番号を格納するリスト
		var nextPosIdx = [];
		// すべての三角形について探索する
		for(var j=0; j<this.tri.length; j++){
			// 着目する頂点i を含む三角形ならばフラグを立てる
			var triFlag = false;
			for(var k=0; k<3; k++){
				if(this.tri[j][k] == i){
					triFlag = true;
					break;
				}
			}
			// 頂点i を含む三角に対しての処理
			if(triFlag){
				for(var k=0; k<3; k++){
					// 頂点i は格納しない
					if(this.tri[j][k] == i) continue;
					// これまでのリストで
					// 頂点の重複が起きないようにする
					var dupFlag = false;
					for(var l=0; l<nextPosIdx.length; l++){
						if(this.tri[j][k] == nextPosIdx[l]){
							dupFlag = true;
						}
					}
					// 重複がなければリストに追加
					if(!dupFlag){
						nextPosIdx.push(this.tri[j][k]);
					}
				}// k
			}// if
		}// j
		var center = [0,0];
		for(var j=0; j<nextPosIdx.length; j++){
			center = numeric.add(center, posTmp[nextPosIdx[j]]);
		}
		var num = nextPosIdx.length;
		center = numeric.div(center, num);
		this.dPos[i] = numeric.mul(center,1);
	}// i
}// functiuon


