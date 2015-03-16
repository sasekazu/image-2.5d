
/// <reference path="numeric-1.2.6.min.js" />


//////////////////////////////////////////////////
/////// 線分クラス
//////////////////////////////////////////////////
function LineSeg(st, ed){
	this.start = numeric.clone(st);   // start point [x,y]
	this.end = numeric.clone(ed);    // end point [x,y]
	this.a = this.end[1] - this.start[1];
	this.b = this.start[0] - this.end[0];
	this.c = (this.end[0]-this.start[0])*this.start[1]
			- (this.end[1]-this.start[1])*this.start[0]; 
	this.vec = numeric.sub(this.end, this.start);
	this.len = numeric.norm2(this.vec);
}

// セッタ
LineSeg.prototype.setStart = function(st){
	this.start[0] = st[0];
	this.start[1] = st[1];
	this.a = this.end[1] - this.start[1];
	this.b = this.start[0] - this.end[0];
	this.c = (this.end[0]-this.start[0])*this.start[1]
			- (this.end[1]-this.start[1])*this.start[0]; 
	this.vec = numeric.sub(this.end, this.start);
	this.len = numeric.norm2(this.vec);
}

LineSeg.prototype.setEnd = function(ed){
	this.end[0] = ed[0];
	this.end[1] = ed[1];
	this.a = this.end[1] - this.start[1];
	this.b = this.start[0] - this.end[0];
	this.c = (this.end[0]-this.start[0])*this.start[1]
			- (this.end[1]-this.start[1])*this.start[0]; 
	this.vec = numeric.sub(this.end, this.start);
	this.len = numeric.norm2(this.vec);
}

// 線分との交差判定
LineSeg.prototype.intersect = function(ls){
	var intersection = false;
	var t1 = ((this.start[0] - this.end[0]) * (ls.start[1] - this.start[1]) + (this.start[1] - this.end[1]) * (this.start[0] - ls.start[0])) * 
		((this.start[0] - this.end[0]) * (ls.end[1] - this.start[1]) + (this.start[1] - this.end[1]) * (this.start[0] - ls.end[0]));
	var t2 = ((ls.start[0] - ls.end[0]) * (this.start[1] - ls.start[1]) + (ls.start[1] - ls.end[1]) * (ls.start[0] - this.start[0])) * 
			((ls.start[0] - ls.end[0]) * (this.end[1] - ls.start[1]) + (ls.start[1] - ls.end[1]) * (ls.start[0] - this.end[0]));
	if (t1 <= 0 && t2 <= 0) {
		if ((this.start[1] - this.end[1]) / (this.start[0] - this.end[0])
			!= (ls.start[1] - ls.end[1]) / (ls.start[0] - ls.end[0])) {
			intersection = true;
		}
	}
	return intersection;
}

// 線分同士の交点の計算
LineSeg.prototype.crossPos = function (ls) {
	var cross = new Array(2);
	cross[0] = (this.b*ls.c-ls.b*this.c)/(this.a*ls.b-ls.a*this.b);
	cross[1] = (ls.a*this.c-this.a*ls.c)/(this.a*ls.b-ls.a*this.b);
	return cross;
}

// x軸に平行な直線(y=*)との交点のx座標
LineSeg.prototype.crossXpos = function(y){
	return (-this.b*y-this.c)/this.a;
}
// y軸に平行な直線(x=*)との交点のx座標
LineSeg.prototype.crossYpos = function(x){
	return (-this.a*x-this.c)/this.b;
}

//////////////////////////////////////////////////
/////// 閉曲線クラス
//////////////////////////////////////////////////
function ClosedCurve(resol) {
	this.endpos = [];
	this.lines = []; // LineSegクラスのオブジェクトのリスト
	this.minlen = resol;
	this.closedFlag = false;
}

// 点列データからClosedCurveを作成
ClosedCurve.prototype.buildFromPoints = function(points){

	for(var i=0; i<points.length-1; ++i){
		this.lines.push(new LineSeg(points[i], points[i+1]));
	}
	this.closedFlag = true;
	this.endpos = numeric.mul(this.lines[0].start,1);
	this.lines[this.lines.length-1].setEnd(this.endpos);

}


// 点の追加
ClosedCurve.prototype.addPoint = function (pos) {
	// グローバル変数minlenでメンバ変数minlenを書き換える
	// (2.5D Mesherでスライダでminlenを調整にするための策)
	this.minlen = minlen;
	// 最初の点の追加
	if (this.endpos.length == 0) {
		this.endpos[0] = pos[0];
		this.endpos[1] = pos[1];
	}
	// すでに閉じてる場合は何もしない
	else if (this.closedFlag) {
	}
	else {
		// 最後尾の点と追加する点の距離を測る
		var rel = numeric.sub(pos, this.endpos);
		var len = numeric.norm2(rel);
		// 距離がminlen以上ならば追加する
		if (len >= this.minlen) {
			var ls = new LineSeg(this.endpos, pos);
			this.lines.push(ls);
			this.endpos = pos;
		} else {
			return;
		}
		// 交差判定を行う
		// 追加した線分の隣以外の線分と比較する
		var doneFlag = false;
		/*
		if (this.lines.length > 1) {
			for (var i = 0; i < this.lines.length - 2; i++) {
				if (this.lines[this.lines.length - 1].intersect(this.lines[i])) {
					this.closedFlag = true;
					var cross = this.lines[this.lines.length - 1].crossPos(this.lines[i]);
					this.endpos = numeric.mul(cross, 1);
					// 切れ端を削除する
					this.lines.splice(0,i);
					// 閉曲線の開始点を修正する
					this.lines[0].setStart(this.endpos);
					this.lines[this.lines.length-1].setEnd(this.endpos);
					doneFlag = true;
					break;
				}
			}
		}
		*/

		// 最初の1点の近傍の場合交差とみなす
		if (this.lines.length > 2 && !doneFlag) {
			var srel = numeric.sub(pos, this.lines[0].start);
			var slen = numeric.norm2(srel);
			var thresiold = this.minlen*2;
			if (slen < thresiold) {
				this.closedFlag = true;
				this.endpos = numeric.mul(this.lines[0].start,1);
				this.lines[this.lines.length-1].setEnd(this.endpos);
				doneFlag = true;
			}
		}
		
		// 線が長すぎる場合、線分を分割する
		if (this.lines[this.lines.length-1].len > this.minlen*2) {
			var div = ~~(this.lines[this.lines.length - 1].len/this.minlen);
			var dvec = numeric.div(this.lines[this.lines.length-01].vec,div);
			this.lines[this.lines.length-1].end = numeric.add(this.lines[this.lines.length-1].start,dvec);
			for (var i = 0; i < div - 1; i++) {
				var svec = numeric.mul(this.lines[this.lines.length-1].end,1);
				var evec = numeric.add(svec,dvec);
				var nl = new LineSeg(svec,evec);
				this.lines.push(nl);
			}
		}
		
	}
}

// 閉曲線同士の交差判定
ClosedCurve.prototype.intersect = function (cv) {
	for (var i = 0; i < this.lines.length; i++) {
		for (var j = 0; j < cv.lines.length; j++) {
			if(this.lines[i].intersect(cv.lines[j]))
				return true;
		}
	}
	return false;
}


// 点の内外判定
// 点がclosed curveの内側 ture, 外側 false
ClosedCurve.prototype.pointInOrOut=function (p) {

	if(p.length==0) return flase;

	// +x方向へレイを出す
	var countxp=0;
	var ZERO=1e-10;
	for(var j=0; j<this.lines.length; j++) {

		// pを通りx軸に平行な直線に交わるかどうか
		var dys=this.lines[j].start[1]-p[1];
		var dye=this.lines[j].end[1]-p[1];
		if(Math.abs(dys)<ZERO) dys=0;
		if(Math.abs(dye)<ZERO) dye=0;
		if(dys*dye>0) continue;
		// 線分がx軸に平行な場合は除外
		if(Math.abs(this.lines[j].a)<ZERO) continue;
		// pを通り+x方向に出したレイが線分と交わるかどうか
		var interx=this.lines[j].crossXpos(p[1]);
		if(interx<p[0]) continue;
		// 交点が線分のend側だった場合、交わっていないとみなす
		if(
			Math.abs(interx-this.lines[j].end[0])<ZERO
			&&
			Math.abs(p[1]-this.lines[j].end[1])<ZERO
			) {
			continue;
		}
		// 交点が線分のstart側だが接点である場合、交わっていないとみなす
		if(
			Math.abs(interx-this.lines[j].start[0])<ZERO
			&&
			Math.abs(p[1]-this.lines[j].start[1])<ZERO
			) {
			var thisy=this.lines[j].start[1];
			var nexty=this.lines[j].end[1];
			var befline=j-1;
			if(j==0) befline=this.lines.length-1;
			var befry=this.lines[befline].start[1];
			if((nexty-thisy)*(befry-thisy)>=0) {
				continue;
			}
		}
		++countxp;
	}
	return countxp%2==1;
}
	
//////////////////////////////////////////////////
/////// 輪郭クラス
//////////////////////////////////////////////////
function Outline() {
	this.closedCurves = [];
	this.xmin = 0;
	this.ymin = 0;
	this.xmax = 0;
	this.ymax = 0;

	// マウスでつまむためのメンバ変数
	this.holdNode = [];
	this.mousePosClick = [];
	this.uClick = []; // setBoundaryのためのメンバ, クリック時のUベクトル
	this.gripRad = 10; // setBoudaryにおける周辺拘束領域の半径
}

// 閉曲線の追加
Outline.prototype.addClosedLine  = function(cl){
	this.closedCurves.push(cl);
	var x = [];
	var y = [];
	for(var i=0; i<this.closedCurves.length; i++){
		for (var j = 0; j < this.closedCurves[i].lines.length; j++) {
			x.push(this.closedCurves[i].lines[j].start[0]);
			y.push(this.closedCurves[i].lines[j].start[1]);
		}
	}
	this.xmin = Math.min.apply(null, x);
	this.xmax = Math.max.apply(null, x);
	this.ymin = Math.min.apply(null, y);
	this.ymax = Math.max.apply(null, y);
}

// 点の内外判定
// 点がoutlineの内側 ture, 外側 false
// mode == "radius" のとき頂点から半径minlen以内の点は外側とみなす
Outline.prototype.pointInOrOut = function (p, mode) {

	if(p.length==0)return flase;

	// +x方向へレイを出す
	var countxp=0;
	var ZERO = 1e-10;
	for(var i=0; i<this.closedCurves.length; i++) {
		for(var j=0; j<this.closedCurves[i].lines.length; j++) {

			// pを通りx軸に平行な直線に交わるかどうか
			var dys = this.closedCurves[i].lines[j].start[1]-p[1];
			var dye = this.closedCurves[i].lines[j].end[1]-p[1];
			if(Math.abs(dys)<ZERO)dys=0;
			if(Math.abs(dye)<ZERO)dye=0;
			if(dys*dye>0) continue;
			// 線分がx軸に平行な場合は除外
			if(Math.abs(this.closedCurves[i].lines[j].a)<ZERO) continue;
			// pを通り+x方向に出したレイが線分と交わるかどうか
			var interx = this.closedCurves[i].lines[j].crossXpos(p[1]);
			if(interx<p[0]) continue;
			// 交点が線分のend側だった場合、交わっていないとみなす
			if(
				Math.abs(interx-this.closedCurves[i].lines[j].end[0])<ZERO
				&&
				Math.abs(p[1]-this.closedCurves[i].lines[j].end[1])<ZERO
			  ) {
				continue;
			}
			// 交点が線分のstart側だが接点である場合、交わっていないとみなす
			if(
				Math.abs(interx-this.closedCurves[i].lines[j].start[0])<ZERO
				&&
				Math.abs(p[1]-this.closedCurves[i].lines[j].start[1])<ZERO
			  ) {
				var thisy = this.closedCurves[i].lines[j].start[1];
				var nexty = this.closedCurves[i].lines[j].end[1];
				var befline = j-1;
				if(j==0)befline=this.closedCurves[i].lines.length-1;
				var befry = this.closedCurves[i].lines[befline].start[1];
				if((nexty-thisy)*(befry-thisy)>=0) {
					continue;
				}
			}

			// 頂点の半径サイズ以内であれば外側にする
			if(mode=="radius") {
				var rel, len;
				var endflag=false;
				for(var k=0; k<this.closedCurves.length; k++) {
					for(var l=0; l<this.closedCurves[k].lines.length; l++) {
						rel=numeric.sub(p, this.closedCurves[k].lines[l].start);
						len=numeric.norm2(rel);
						if(len<this.closedCurves[k].minlen) endflag=true;
					}
					if(endflag) break;
				}
				if(endflag) continue;
			}

			++countxp;
		}
	}

	return countxp%2==1;

}


// クリック時の処理
Outline.prototype.selectHoldNodes = function(mousePos){	

	if(this.closedCurves.length == 0) {
		return ;
	}

	this.mousePosClick = new Array(mousePos.length);
	for(var i=0; i<mousePos.length; i++){
		this.mousePosClick[i] = new Array(2);
		this.mousePosClick[i][0] = mousePos[i][0];
		this.mousePosClick[i][1] = mousePos[i][1];
	}
		
	this.holdNode = new Array(mousePos.length);
	for(var i=0; i<mousePos.length; i++){
		this.holdNode[i] = [];				
	}

	this.uClick = new Array(mousePos.length);
	for(var i = 0; i < mousePos.length; i++) {
		this.uClick[i] = [];
	}
	
	var dif;
	var dist;
	var nearNd;
	var minDist;
	for(var cl=0; cl<mousePos.length; cl++){
		dif = numeric.sub(mousePos[cl],this.closedCurves[0].lines[0].start);
		dist = numeric.norm2(dif);
		nearNd = [0, 0];
		minDist =  dist;
		for(var cc = 0; cc < this.closedCurves.length; ++cc) {
			for(var l = 0; l < this.closedCurves[cc].lines.length; ++l) {
				dif = numeric.sub(mousePos[cl], this.closedCurves[cc].lines[l].start);
				dist = numeric.norm2(dif);
				if(minDist > dist) {
					minDist = dist;
					nearNd = [cc, l];
				}
			}
		}
		if(minDist < this.gripRad) {
			this.holdNode[cl] = numeric.clone(nearNd);
			this.uClick[cl] = numeric.sub(this.closedCurves[nearNd[0]].lines[nearNd[1]].start, mousePos[cl]);
		}
	}
}


// 境界条件の設定
Outline.prototype.setBoundary = function(clickState, mousePos){
	
	if(mousePos.length != this.holdNode.length)
		this.selectHoldNodes(mousePos);
	
	// クリックノードの境界条件
	if(clickState == "Down"){
		for(var cl=0; cl<mousePos.length; cl++){
			if(this.holdNode[cl].length === 0) {
				continue;
			}
			var cc = this.holdNode[cl][0];
			var l = this.holdNode[cl][1];
			var newStart = numeric.add(this.uClick[cl], mousePos[cl]);
			this.closedCurves[cc].lines[l].setStart(newStart);
			if(l > 0) {
				var newEnd = numeric.add(this.uClick[cl], mousePos[cl]);
				this.closedCurves[cc].lines[l-1].setEnd(newEnd);
			} else {
				var cclen = this.closedCurves[cc].lines.length;
				var newEnd = numeric.add(this.uClick[cl], mousePos[cl]);
				this.closedCurves[cc].lines[cclen-1].setEnd(newEnd);
			}
		}
	}
}

