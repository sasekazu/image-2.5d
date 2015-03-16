
	
/////////////////////////////////////////
// 画像から輪郭線を抽出する関数
////////////////////////////////////////
function getOutlineFromImg(canvas, img, cutoff) {

	var context = canvas.get(0).getContext("2d");
	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();

	// 描画処理
	// 画面をリセット
	context.setTransform(1,0,0,1,0,0);
	context.clearRect(0, 0, canvasWidth, canvasHeight);

	// 画像描画
	context.drawImage(img, dx, dy, dw, dh);

	var imgData = context.getImageData(0,0,canvasWidth,canvasHeight);

	// 2値化
	binarization(imgData, cutoff);

	// オープニング（画像の平滑化として）
	var openningItr = 2;
	// 収縮
	for(var i = 0; i < openningItr; ++i) {
		erosion(imgData);
	}
	// 膨張
	for(var i = 0; i < openningItr; ++i) {
		dilation(imgData);
	}

	
	context.putImageData(imgData, 0, 0);

	// エッジポイント取得
	var points = getEdgePointsFromImg(imgData);

	// ハッシュグリッドの分割数
	var divx = 10;
	var divy = 10;
	var epsilon = 3;

	// ポイントを間引く
	var pointsAndNormals = getThinedPointsAndNormals(points, imgData, divx, divy, epsilon);
	var points_thin = pointsAndNormals.points;

	// ポイントから輪郭を取得
	var outlines = getOutlinesFromPoints(points_thin, imgData, divx, divy, epsilon);


	// canvasをクリアする
	/*
	for(var i = 0; i < imgData.height*imgData.width; ++i) {
		imgData.data[4*i+0] = 255;
		imgData.data[4*i+1] = 255;
		imgData.data[4*i+2] = 255;
		imgData.data[4*i+3] = 255;
	}
	*/
		
	{
		var idx;
		for(var i = 0; i < points_thin.length; ++i) {
			idx = imgData.width * points_thin[i][1] + points_thin[i][0];
			imgData.data[4*idx+0] = 0;
			imgData.data[4*idx+1] = 255;
			imgData.data[4*idx+2] = 0;
			imgData.data[4*idx+3] = 255;
		}
	}

	{
		var idx;
		for(var i = 0; i < outlines.length; ++i) {
			for(var j = 0; j < outlines[i].length; ++j) {
				idx = imgData.width * points_thin[outlines[i][j]][1] + points_thin[outlines[i][j]][0];
				imgData.data[4*idx+0] = 255;
				imgData.data[4*idx+1] = 0;
				imgData.data[4*idx+2] = 0;
				imgData.data[4*idx+3] = 255;
			}
		}
	}


	context.putImageData(imgData, 0, 0);

	context.strokeStyle = 'red';
	for(var i = 0; i < outlines.length; ++i) {
		context.beginPath();
		context.moveTo(points_thin[outlines[i][0]][0],points_thin[outlines[i][0]][1]);
		for(var j = 1; j < outlines[i].length; ++j) {
			context.lineTo(points_thin[outlines[i][j]][0], points_thin[outlines[i][j]][1]);
		}
		context.stroke();
	}

	return {vertex: points_thin, connectivity: outlines};
}



function binarization(imgData, cutoff) {
	var gray;
	for(var i = 0; i < imgData.width * imgData.height; ++i) {
		gray = 0.299 * imgData.data[4*i] + 0.587 * imgData.data[4*i+1] + 0.114 * imgData.data[4*i+2];
		gray = Math.floor(gray);
		if(gray > cutoff || imgData.data[4*i+3] == 0) {
			gray = 255;
		} else {
			gray = 0;
		}
		imgData.data[4*i] = gray;
		imgData.data[4*i+1] = gray;
		imgData.data[4*i+2] = gray;
		imgData.data[4*i+3] = 255;
	}
}

// 白を縮小
function erosion(imgData) {
	var newImgData = new Array(imgData.data.length);
	for(var i = 0; i < imgData.data.length; ++i) {
		newImgData[i] = imgData.data[i];
	}
	{
		var idx, target, isAdjacentToBlack, tmp;
		for(var i = 0; i < imgData.height; ++i) {
			for(var j = 0; j < imgData.width; ++j) {
				idx = imgData.width*i+j;
				if(imgData.data[4*idx] > 0) {
					isAdjacentToBlack = false;
					// 下
					tmp = i-1;
					if(tmp >= 0 && tmp < imgData.height) {
						target = imgData.width*(tmp)+j;
						if(imgData.data[4 * target] == 0) {
							isAdjacentToBlack = true;
						}
					}
					// 上
					tmp = i+1;
					if(tmp >= 0 && tmp < imgData.height) {
						target = imgData.width*(tmp)+j;
						if(imgData.data[4 * target] == 0) {
							isAdjacentToBlack = true;
						}
					}
					// 左
					tmp = j-1;
					if(tmp >= 0 && tmp < imgData.width) {
						target = imgData.width*i+(tmp);
						if(imgData.data[4 * target] == 0) {
							isAdjacentToBlack = true;
						}
					}
					// 右
					tmp = j+1;
					if(tmp >= 0 && tmp < imgData.width) {
					target = imgData.width*i+(tmp);
						if(imgData.data[4 * target] == 0) {
							isAdjacentToBlack = true;
						}
					}
					if(isAdjacentToBlack) {
						newImgData[4*idx] = 0;
						newImgData[4*idx+1] = 0;
						newImgData[4*idx+2] = 0;
					}
				}
			}
		}
	}
	for(var i = 0; i < imgData.data.length; ++i) {
		imgData.data[i] = newImgData[i];
	}
}


// 白を膨張
function dilation(imgData) {
	var newImgData = new Array(imgData.data.length);
	for(var i = 0; i < imgData.data.length; ++i) {
		newImgData[i] = imgData.data[i];
	}
	{
		var idx, target, isAdjacentToBlack, tmp;
		for(var i = 0; i < imgData.height; ++i) {
			for(var j = 0; j < imgData.width; ++j) {
				idx = imgData.width*i+j;
				if(imgData.data[4*idx] > 0) {
					// 下
					tmp = i-1;
					if(tmp >= 0 && tmp < imgData.height) {
						target = imgData.width*(tmp)+j;
						newImgData[4*target] =  255;
						newImgData[4*target+1] = 255;
						newImgData[4*target+2] = 255;
					}
					// 上
					tmp = i+1;
					if(tmp >= 0 && tmp < imgData.height) {
						target = imgData.width*(tmp)+j;
						newImgData[4*target] =  255;
						newImgData[4*target+1] = 255;
						newImgData[4*target+2] = 255;
					}
					// 左
					tmp = j-1;
					if(tmp >= 0 && tmp < imgData.width) {
						target = imgData.width*i+(tmp);
						newImgData[4*target] =  255;
						newImgData[4*target+1] = 255;
						newImgData[4*target+2] = 255;
					}
					// 右
					tmp = j+1;
					if(tmp >= 0 && tmp < imgData.width) {
						target = imgData.width*i+(tmp);
						newImgData[4*target] =  255;
						newImgData[4*target+1] = 255;
						newImgData[4*target+2] = 255;
					}
				}
			}
		}
	}
	for(var i = 0; i < imgData.data.length; ++i) {
		imgData.data[i] = newImgData[i];
	}
}


function getEdgePointsFromImg(imgData) {
	var toumei, shiro, isInner, idx, edge_tmp;
	var cutoff = 240;
	var points = [];
	var x,y;
	for(var i = 0; i < imgData.height; ++i) {
		for(var j = 0; j < imgData.width; ++j) {
			idx = imgData.width*i+j;
			toumei = (imgData.data[4*idx+3]=== 0);
			shiro = (imgData.data[4*idx] > cutoff &&	imgData.data[4*idx+1] > cutoff && imgData.data[4*idx+2] > cutoff);
			isInner = !(toumei || shiro);
			edge_tmp = false;
			if(isInner) {
				for(var k = 0; k < 3; ++k) {
					for(var l = 0; l < 3; ++l) {
						x = j-1+l;
						y = i-1+k;
						if(x < 0 || x >= imgData.width || y < 0 || y >= imgData.height) {
							isInner = false;
						} else {
							idx = imgData.width*y+x;
							toumei = (imgData.data[4*idx+3]=== 0);
							shiro = (imgData.data[4*idx] > cutoff &&	imgData.data[4*idx+1] > cutoff && imgData.data[4*idx+2] > cutoff);
							isInner = !(toumei || shiro);
						}
						if(!isInner) {
							edge_tmp = true;
						}
					}
				}
			}
			if(edge_tmp) {
				points.push([j,i]);
			}
		}
	}
	return points;
}



function getThinedPointsAndNormals(points, imgData, divx, divy, epsilon) {
		
	var isPointActive = new Array(points.length);
	for(var i = 0; i < points.length; ++i) {
		isPointActive[i] = true;
	}


	// ハッシュの作成
	var binx = imgData.width / divx;
	var biny = imgData.height / divy;
	var hash = new Array(divx);
	for(var i = 0; i < divx; ++i) {
		hash[i] = new Array(divy);
		for(var j = 0; j < divy; ++j) {
			hash[i][j] = [];
		}
	}
	{
		var x, y;
		for(var i = 0; i < points.length; ++i) {
			x = Math.floor(points[i][0]/binx);
			y = Math.floor(points[i][1]/biny);
			if(x >= divx){
				x = divx - 1;
			}
			if(y >= divy) {
				y = divy - 1;
			}
			hash[x][y].push(i);
		}
	}

	// ハッシュに格納されたポイントの描画(色付き)
	/*
	{
		var pt, ptIdx;
		for(var i = 0; i < divx; ++i) {
			for(var j = 0; j < divy; ++j) {
				for(var k=0; k<hash[i][j].length; ++k){
					pt = hash[i][j][k];
					ptIdx = imgData.width*points[pt][1] + points[pt][0];
					imgData.data[4*ptIdx+0] = 255*i/divx;
					imgData.data[4*ptIdx+1] = 255*j/divy;
					imgData.data[4*ptIdx+2] = 255;
					imgData.data[4*ptIdx+3] = 255;
				}
			}
		}
	}

	// ハッシュグリッドを描画
	{
		var idx;
		for(var i = 0; i < divx; ++i) {
			for(var j = 0; j < imgData.height; ++j) {
				idx = imgData.width*j + Math.floor(i*binx);
				imgData.data[4*idx+0] = 255;
				imgData.data[4*idx+1] = 0;
				imgData.data[4*idx+2] = 0;
				imgData.data[4*idx+3] = 255;
			}
		}
		for(var i = 0; i < divy; ++i) {
			for(var j = 0; j < imgData.width; ++j) {
				idx = imgData.width*Math.floor(i*biny) + j;
				imgData.data[4*idx+0] = 255;
				imgData.data[4*idx+1] = 0;
				imgData.data[4*idx+2] = 0;
				imgData.data[4*idx+3] = 255;
			}
		}
	}
		
	*/

	for(var i = 0; i < points.length; ++i) {
		if(!isPointActive[i]) {
			continue;
		}
	}

	var points_thin = [];
	var normals_thin = [];


	{
		var x,y;
		var target = [];
		var dist2;
		for(var i = 0; i < points.length; ++i) {
			// 現時点でActiveであるものだけを調べる
			if(!isPointActive[i]) {
				continue;
			}
			// ハッシュインデックスの取得
			x = Math.floor(points[i][0]/binx);
			y = Math.floor(points[i][1]/biny);
			if(x >= divx){
				x = divx - 1;
			}
			if(y >= divy) {
				y = divy - 1;
			}
			// ハッシュから周辺(隣接するグリッド)の点IDをtargetに格納
			target = [];
			var hashx, hashy;
			for(var j = 0; j < 3; ++j) {
				for(var k = 0; k < 3; ++k) {
					hashx = x-1+j;
					hashy = y-1+k;
					if(hashx < 0 || hashx >= divx) {
						continue;
					}
					if(hashy < 0 || hashy >= divy) {
						continue;
					}
					for(var l = 0; l < hash[hashx][hashy].length; ++l) {
						target.push(hash[hashx][hashy][l]);
					}
				}
			}
			// 距離がepsilon以下の物を無効化する
			var nearPoints = [];
			nearPoints.push(points[i]);
			for(var j = 0; j < target.length; ++j) {
				dist2 = (points[target[j]][0]-points[i][0])*(points[target[j]][0]-points[i][0])
					+(points[target[j]][1]-points[i][1])*(points[target[j]][1]-points[i][1]);
				// 距離の比較、距離がゼロの場合は自分自身なので除外
				if(dist2 !== 0 && dist2 < epsilon * epsilon) {
					isPointActive[target[j]] = false;
					nearPoints.push(points[target[j]]);
				}
			}


			// 法線ベクトルは使わないことにしたが
			// いずれ必要があれば下のコメントアウトを復活させる
			var normal;
			/*
			// 法線ベクトルを作るための近隣の点が6個以上になるまで
			// 近隣領域を広げてnearPointsを増やす
			// この探索で見つかった点のActiveフラグは変更しない
			var spread = 1;
			while(nearPoints.length < 6 ) {
				++spread; 
				for(var j = 0; j < target.length; ++j) {
					dist2 = (points[target[j]][0]-points[i][0])*(points[target[j]][0]-points[i][0])
						+(points[target[j]][1]-points[i][1])*(points[target[j]][1]-points[i][1]);
					// 距離の比較、距離がゼロの場合は自分自身なので除外
					if(dist2 !== 0 && dist2 < spread * epsilon * epsilon) {
						nearPoints.push(points[target[j]]);
					}
				}
				if(spread > 10){
					break;
				}
			}

			// 広げても点が増えていない場合、
			// 重要な点ではないのでActiveフラグを下して
			// 次のループへ
			if(nearPoints.length < 6) {
				isPointActive[i] = false;
				continue;
			}

			// 無効化された点群から最小二乗法により近似直線を計算し
			// 法線ベクトルを得る
			var A = [[0,0],[0,0]];
			var b = [0,0];
			for(var j = 0; j < nearPoints.length; ++j) {
				A[0][0] += nearPoints[j][0] * nearPoints[j][0];
				A[0][1] += nearPoints[j][0];
				A[1][1] += 1;
				b[0] += nearPoints[j][0] * nearPoints[j][1];
				b[1] += nearPoints[j][1];
			}
			A[1][0] = A[0][1];
			var Ainv = [[0,0],[0,0]];
			var divAdet = 1.0/(A[0][0]*A[1][1]-A[0][1]*A[1][0]);
			Ainv[0][0] = divAdet * A[1][1];
			Ainv[0][1] = - divAdet * A[0][1];
			Ainv[1][0] = - divAdet * A[1][0];
			Ainv[1][1] = divAdet * A[0][0];
			var xvec = [0,0];
			for(var j = 0; j < 2; ++j) {
				for(var k = 0; k < 2; ++k) {
					xvec[j] += Ainv[j][k] * b[k];
				}
			}
			// xvecがNaNになるのは y = a*x + b であらわせない直線　
			// つまり a = 無限大 のとき
			if(isNaN(xvec[0])){
				normal = [1,0];
			} else {
				normal = [xvec[0],-1];
				var norm = Math.sqrt(normal[0]*normal[0]+normal[1]*normal[1]);
				normal[0] /= norm;
				normal[1] /= norm;
			}
			
			if(xvec[0] == 0) {
				var yisonaji = true;
				for(var j = 0; j < nearPoints.length; ++j) {
					if(nearPoints[j][1] != nearPoints[0][1]) {
						yisonaji = false;
						break;
					}
				}
				if(!yisonaji) {
					console.log(nearPoints.length);
					console.log(nearPoints);
				}
			}
			*/

			points_thin.push(points[i]);
			normals_thin.push(normal);
		}
	}

	return { points: points_thin, normals: normals_thin };

}


function getOutlinesFromPoints(points_thin, imgData, divx, divy, epsilon) {

	var binx = imgData.width / divx;
	var biny = imgData.height / divy;

	// 間引いた点群のハッシュを作る
	var hash_thin = new Array(divx);
	for(var i = 0; i < divx; ++i) {
		hash_thin[i] = new Array(divy);
		for(var j = 0; j < divy; ++j) {
			hash_thin[i][j] = [];
		}
	}
	{
		var x, y;
		for(var i = 0; i < points_thin.length; ++i) {
			x = Math.floor(points_thin[i][0]/binx);
			y = Math.floor(points_thin[i][1]/biny);
			if(x >= divx){
				x = divx - 1;
			}
			if(y >= divy) {
				y = divy - 1;
			}
			hash_thin[x][y].push(i);
		}
	}

	// 点同士の接続リストを作る
	var outlines = [];
	var isPointLinked = new Array(points_thin.length);
	for(var i=0; i<isPointLinked.length; ++i){
		isPointLinked[i] = false;
	}


	while(1){

		var outline = [];
		// 0番を始点とする
		var isAllPointLinked = true;
		for(var i = 0; i < isPointLinked.length; ++i) {
			if(!isPointLinked[i]) {
				outline.push(i);
				isPointLinked[i] = true;
				isAllPointLinked = false;
				break;
			}
		}
		if(isAllPointLinked) {
			break;
		}

		// outlineの最後尾の点から最も近い点を探して追加する
		var tail;
		var target = [];
		while(outline.length!=0) {
			var x,y;
			var dist2;
			tail = outline[outline.length-1];
			// ハッシュインデックスの取得
			x = Math.floor(points_thin[tail][0]/binx);
			y = Math.floor(points_thin[tail][1]/biny);
			if(x >= divx){
				x = divx - 1;
			}
			if(y >= divy) {
				y = divy - 1;
			}
			// ハッシュから周辺(隣接するグリッド)の点IDをtargetに格納
			target = [];
			var hashx, hashy;
			for(var j = 0; j < 3; ++j) {
				for(var k = 0; k < 3; ++k) {
					hashx = x-1+j;
					hashy = y-1+k;
					if(hashx < 0 || hashx >= divx) {
						continue;
					}
					if(hashy < 0 || hashy >= divy) {
						continue;
					}
					for(var l = 0; l < hash_thin[hashx][hashy].length; ++l) {
						target.push(hash_thin[hashx][hashy][l]);
					}
				}
			}
			// 距離が最小のものを見つける　
			var dist_min = 4*epsilon;
			var dist_min2 = dist_min*dist_min;
			var next = -1;
			for(var j = 0; j < target.length; ++j) {
				if(isPointLinked[target[j]]) {
					continue;
				}
				dist2 = (points_thin[target[j]][0]-points_thin[tail][0])*(points_thin[target[j]][0]-points_thin[tail][0])
						+(points_thin[target[j]][1]-points_thin[tail][1])*(points_thin[target[j]][1]-points_thin[tail][1]);
				// 距離の比較、距離がゼロの場合は自分自身なので除外
				if(dist2 !== 0 && dist2 < dist_min2) {
					dist_min2 = dist2;
					next = target[j];
				}
			}
			if(next == -1) {
				break;
			}
			isPointLinked[next] = true;
			outline.push(next);
		}
		var tail = outline[outline.length-1];
		var head = outline[0];
		var dist_head_tail = (points_thin[tail][0]-points_thin[head][0])*(points_thin[tail][0]-points_thin[head][0])
								+ (points_thin[tail][1]-points_thin[head][1])*(points_thin[tail][1]-points_thin[head][1]);


		// 3点で構成されるoutlineは追加しない
		// 最後尾の点と開始点が遠すぎる場合も追加しない
		if(outline.length > 3 && dist_head_tail<epsilon*epsilon*4*4) {
			outline.push(head);
			outlines.push(outline);
		}

	}

	return outlines;
}