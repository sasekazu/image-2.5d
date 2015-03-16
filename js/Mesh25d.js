// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />
/// <reference path="outline.js" />
/// <reference path="delaunay.js" />


////////////////////////////////////////////////////////////
// Mesh25dクラスの定義
////////////////////////////////////////////////////////////
	
function Mesh25d(initpos, tri){
	this.pos2d = numeric.clone(initpos);      // 節点現在位置
	this.initpos = numeric.clone(initpos);  // 節点初期位置

	this.posNum2d = this.pos2d.length;

	this.tri = numeric.clone(tri); // 三角形要素の節点リスト
	this.nodeToTri = [];		// ノードに接続している三角形要素リスト
	this.surEdge = [];			// 表面エッジリスト
	this.surToTri = [];		// 表面エッジ-対応する三角形要素リスト
	this.triToSur = [];		// 三角形要素-対応する表面エッジリスト
	this.sndToSur = [];	// 表面頂点に接続している表面エッジリスト

	this.makeSurface();

	this.pos;
	this.xmax;
	this.xmin;
	this.ymax;
	this.ymin;
	this.normal;
	this.modelLength;
	this.modelTop;
	this.modelBottom;
	this.make3d();

}


Mesh25d.prototype.makeSurface = function(){
	// nodeToTriの作成
	this.nodeToTri = new Array(this.posNum2d);
	for(var i=0; i<this.posNum2d; i++)
		this.nodeToTri[i] = [];
	for(var i = 0; i < this.tri.length; i++) 
		for(var vert = 0; vert < 3; vert++) 
			this.nodeToTri[this.tri[i][vert]].push(i);

	// surEdge, surToTri, triToSur, sndToSurの作成
	// 四面体についてのループを回し、
	// 四面体の各エッジが現在着目している四面体以外の四面体に共有されているかどうかを調べる
	// (エッジの頂点番号からnodeToTetを参照すれば判定できる)
	// 共有されていなければそれは表面エッジであるとみなす
	var buf = [[0,1,2],[1,2,0],[2,0,1]];
	var n1,n2,n3;	// bufに対応する頂点番号
	var nt1, nt2; // nodeToTetの一次格納変数
	var shareFlag;
	var surCount = 0;
	var v1,v2;	
	this.triToSur = new Array(this.tri.length);
	for(var i = 0; i < this.tri.length; i++) {
		this.triToSur[i] = [];
	}
	for(var i = 0; i < this.tri.length; i++) {
		for(var edg = 0; edg < 3; edg++) {
			shareFlag = false;
			n1 = this.tri[i][buf[edg][0]];
			n2 = this.tri[i][buf[edg][1]];
			nt1 = this.nodeToTri[n1];
			nt2 = this.nodeToTri[n2];
			for(var j = 0; j < nt1.length; j++) {
				for(var k = 0; k < nt2.length; k++) {
					if(shareFlag)break;
					if(nt1[j] === nt2[k] && nt1[j] !== i) {
						shareFlag = true;
					}
				}
			}
			if(!shareFlag) {
				// surEdgeに格納する頂点番号の順番が反時計回りになるようにする
				n3 = this.tri[i][buf[edg][2]];
				v1 = numeric.sub(this.initpos[n1],this.initpos[n3]);
				v2 = numeric.sub(this.initpos[n2],this.initpos[n3]);
				if(v1[0]*v2[1]-v1[1]*v2[0]>0)
					this.surEdge.push([this.tri[i][buf[edg][0]], this.tri[i][buf[edg][1]]]);
				else
					this.surEdge.push([this.tri[i][buf[edg][1]], this.tri[i][buf[edg][0]]]);
				this.surToTri.push(i);
				this.triToSur[i].push(surCount);
				++surCount;
			}
		}
	}
}


Mesh25d.prototype.make3d = function () {
	// pos2dの中心位置を求める
	var xmax, ymax, xmin, ymin;
	var center2d = [0,0];
	xmax = this.pos2d[0][0];
	xmin = this.pos2d[0][0];
	ymax = this.pos2d[0][1];
	ymin = this.pos2d[0][1];
	for(var i=0; i<this.posNum2d; i++){
		if(xmax < this.pos2d[i][0]) {
			xmax = this.pos2d[i][0];
		}
		if(xmin > this.pos2d[i][0]) {
			xmin = this.pos2d[i][0];
		}
		if(ymax < this.pos2d[i][1]) {
			ymax = this.pos2d[i][1];
		}
		if(ymin > this.pos2d[i][1]) {
			ymin = this.pos2d[i][1];
		}
	}
	center2d[0] = (xmax+xmin)/2;
	center2d[1] = (ymax+ymin)/2;
	this.xmax = xmax;
	this.xmin = xmin;
	this.ymax = ymax;
	this.ymin = ymin;
	// pos3dの作成
	this.pos = new Array(this.posNum2d * 2);
	for(var i=0; i<this.posNum2d; i++){
		this.pos[i] = new Array(3);
		this.pos[i][0] = this.pos2d[i][0]-center2d[0];
		this.pos[i][1] = -this.pos2d[i][1]+center2d[1];
		this.pos[i][2] = 0.5;
	}
	for(var i=0; i<this.posNum2d; i++){
		this.pos[this.posNum2d+i] = new Array(3);
		this.pos[this.posNum2d+i][0] = this.pos[i][0];
		this.pos[this.posNum2d+i][1] = this.pos[i][1];
		this.pos[this.posNum2d+i][2] = -0.5;
	}
	// triの作成
	var triNum2d = this.tri.length;
	for(var i = 0; i < triNum2d; i++) {
		var tritmp = new Array(3);
		tritmp[0] = this.tri[i][0] + this.posNum2d;
		tritmp[1] = this.tri[i][2] + this.posNum2d;
		tritmp[2] = this.tri[i][1] + this.posNum2d;
		this.tri.push(tritmp);
	}
	// 側面のtriの作成
	for(var i = 0; i < this.surEdge.length; i++) {
		var tritmp1 = new Array(3);
		tritmp1[0] = this.surEdge[i][0];
		tritmp1[1] = this.surEdge[i][1];
		tritmp1[2] = this.surEdge[i][0] + this.posNum2d;
		this.tri.push(tritmp1);
		var tritmp2 = new Array(3);
		tritmp2[0] = this.surEdge[i][0] + this.posNum2d;
		tritmp2[2] = this.surEdge[i][1] + this.posNum2d;
		tritmp2[1] = this.surEdge[i][1];
		this.tri.push(tritmp2);
	}

	this.normal = new Array(this.tri.length);
	for(var i=0; i<triNum2d; i++){
		this.normal[i] = [0,0,1];
	}
	for(var i=0; i<triNum2d; i++){
		this.normal[i+triNum2d] = [0,0,-1];
	}
	for(var i=0; i<this.tri.length-2*triNum2d; i++){
		this.normal[i+triNum2d*2] = [1,1,1];
	}
}


Mesh25d.prototype.makeStl = function (scale, thickness) {
	var stl = "solid mesh2.5d\n";
	for(var i = 0; i < this.tri.length; i++) {
		stl += "facet normal" + " " + this.normal[i][0] + " " + this.normal[i][1]  + " " + this.normal[i][2] + "\n";
		stl += "outer loop\n";
		stl += "vertex " + scale*this.pos[this.tri[i][0]][0] + " " + scale*this.pos[this.tri[i][0]][1] + " " + thickness*this.pos[this.tri[i][0]][2] + "\n";
		stl += "vertex " + scale*this.pos[this.tri[i][1]][0] + " " + scale*this.pos[this.tri[i][1]][1] + " " + thickness*this.pos[this.tri[i][1]][2] + "\n";
		stl += "vertex " + scale*this.pos[this.tri[i][2]][0] + " " + scale*this.pos[this.tri[i][2]][1] + " " + thickness*this.pos[this.tri[i][2]][2] + "\n";
		stl += "endloop\n";
		stl += "endfacet\n";
	}
	stl += "endsolid mesh2.5d\n";
	return stl;
}

Mesh25d.prototype.getPos = function (scale, thickness) {
	var vert = [];
	for(var i = 0; i < this.pos.length; i++) {
		vert.push([scale*this.pos[i][0], scale*this.pos[i][1], thickness*this.pos[i][2]]);
	}

	var modelLengthTmp;
	if(this.xmax - this.xmin > this.ymax - this.ymin) {
		modelLengthTmp = this.xmax - this.xmin;
	} else {
		modelLengthTmp = this.ymax - this.ymin;
	}
	if(scale*modelLengthTmp<thickness){
		this.modelLength = thickness;
	}else{
		this.modelLength = scale * modelLengthTmp;
	}

	this.modelTop = 0.5*thickness;
	this.modelBottom = -0.5 * thickness;

	return vert;
}


