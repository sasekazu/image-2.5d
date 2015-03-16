
	
//////////////////////////////////////////////////////////
//////  描画用関数群
//////////////////////////////////////////////////////////
// x,y座標軸を描画
function drawAxis(context){
	context.beginPath();
	context.moveTo(0,0);
	context.lineTo(canvasWidth,0);
	context.closePath();
	context.stroke();
		
	context.beginPath();
	context.moveTo(0,0);
	context.lineTo(0,canvasHeight);
	context.closePath();
	context.stroke();
}
	
function drawMainGrid(context, scale){
	drawSquareS(context,[-1,-1],[1,-1],[1,1],[-1,1]);
	context.fillStyle = 'rgb(0, 0, 0)'; // 黒
	context.font = "10px 'Arial'";
	context.textAlign = "left";
	p1 = [0,scale*1.0];
	context.fillText("1.0", p1[0], p1[1]);
	p1 = [scale*1.0,0];
	context.fillText("1.0", p1[0], p1[1]);
	p1 = [0,scale*-1.0];
	context.fillText("-1.0", p1[0], p1[1]);
	p1 = [scale*-1.0,0];
	context.fillText("-1.0", p1[0], p1[1]);
}

function drawGrid(context, x0, y0, x1, y1, dx, dy) {
	var nx = (x1-x0)/dx + 1;
	nx = Math.ceil(nx);
	var ny = (y1-y0)/dy + 1;
	ny = Math.ceil(ny);
	for(var i = 0; i < nx; i++) {
		drawLine(context, [x0+dx*i, y0], [x0+dx*i, y1]);
	}
	for(var i = 0; i < ny; i++) {
		drawLine(context, [x0, y0+dy*i], [x1, y0+dy*i]);
	}
}
	
// 線を描画する関数
// 引数は物理座標の２次元ベクトル
function drawLine(context, p1, p2){
	context.beginPath();
	context.moveTo( p1[0], p1[1]);
	context.lineTo( p2[0], p2[1]);
	context.stroke();
}
	
// 三角形を描画する関数
// 引数は物理座標の２次元ベクトル
function drawTri(context, p1, p2, p3){
	context.beginPath();
	context.moveTo( p1[0], p1[1]);
	context.lineTo( p2[0], p2[1]);
	context.lineTo( p3[0], p3[1]);
	context.closePath();
	context.fill();
}
function drawTriS(context, p1, p2, p3){
	context.beginPath();
	context.moveTo( p1[0], p1[1]);
	context.lineTo( p2[0], p2[1]);
	context.lineTo( p3[0], p3[1]);
	context.closePath();
	context.stroke();
}


function drawTriClip(context, p1, p2, p3){
	context.beginPath();
	context.moveTo( p1[0], p1[1]);
	context.lineTo( p2[0], p2[1]);
	context.lineTo( p3[0], p3[1]);
	context.closePath();
}
	
// 四角形を描画する関数
// 引数は物理座標の2次元ベクトル
function drawSquare(context, p1,p2,p3,p4){
	context.beginPath();
	context.moveTo( p1[0], p1[1]);
	context.lineTo( p2[0], p2[1]);
	context.lineTo( p3[0], p3[1]);
	context.lineTo( p4[0], p4[1]);
	context.closePath();
	context.stroke();
	context.fill();
}
	
// 四角形を描画する関数
// 引数は物理座標の2次元ベクトル
function drawSquareS(context, p1,p2,p3,p4){
	context.beginPath();
	context.moveTo( p1[0], p1[1]);
	context.lineTo( p2[0], p2[1]);
	context.lineTo( p3[0], p3[1]);
	context.lineTo( p4[0], p4[1]);
	context.closePath();
	context.stroke();
}
	
// 円を描画する関数
// 引数1 x: 物理座標系の位置x
// 引数2 y: 物理座標系の位置y
// 引数3 radius: 物理座標系における半径
function drawCircle(context, p, radius){
	context.beginPath();
	context.arc( p[0], p[1], radius, 0, 2*Math.PI, true);
	context.stroke();
	context.fill();
}
function drawCircleS(context, p, radius){
	context.beginPath();
	context.arc( p[0], p[1], radius, 0, 2*Math.PI, true);
	context.stroke();
}

// 変形前後の三角形からあふぃん変換行列を計算する関数
// 引数1: 変形前の三角形頂点の位置ベクトル 3 x 2
// 引数2: 変形後の三角形頂点の位置ベクトル 3 x 2
function getAffineMat(tri1, tri2) {
	var after = [ 
		[tri2[1][0] - tri2[0][0], tri2[2][0] - tri2[0][0] ],
		[tri2[1][1] - tri2[0][1], tri2[2][1] - tri2[0][1] ]
	]
	var befor = [
		[tri1[1][0] - tri1[0][0], tri1[2][0] - tri1[0][0]],
		[tri1[1][1] - tri1[0][1], tri1[2][1] - tri1[0][1]]
	]
	var befinv = numeric.inv(befor);
	var affmat = numeric.dot(after, befinv);
	var rel = numeric.sub(tri2[0], tri1[0]);
	var aff = [affmat[0][0], affmat[1][0], affmat[0][1], affmat[1][1], rel[0], rel[1]];
	return aff;
}
	