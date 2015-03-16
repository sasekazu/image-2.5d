//////////////////////////////////////////////////////////
//////  メッシュ生成完了字のwebGLの処理
//////////////////////////////////////////////////////
function renderWebGL(width, height, modelLength, modelTop, modelBottom, vert, face) {
	// レンダラの初期化
	var renderer=new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(width, height);
	renderer.setClearColor(0xffffff, 1);
	var oyadom = document.getElementById('webglBox');
	// 既にwebglの要素が存在する場合削除する
	var webglOldDom = document.getElementById('webgl');
	if(webglOldDom) {
		oyadom.removeChild(webglOldDom);
	}
	// 新しいwebgl要素の作成
	var webglDom = renderer.domElement;
	webglDom.setAttribute('id', 'webgl');
	oyadom.appendChild(webglDom);
	renderer.shadowMapEnabled=true;

	// シーンの作成
	var scene=new THREE.Scene();

	// カメラの作成
	var camera = new THREE.PerspectiveCamera(15, width / height, 1, 100000);
	/*
	var left = - modelLength;
	var right = -left;
	var top = -left * width / height;
	var bottom = left * width / height;
	var camera = new THREE.OrthographicCamera(left, right, top, bottom, 1, 100000);
	*/

	camera.position=new THREE.Vector3(0, 0, 500);
	camera.up = new THREE.Vector3(0,0,1);
	camera.lookAt(new THREE.Vector3(0, 0, 0));
	scene.add(camera);

	// カメラコントロールを作成
	//var cameraCtrl=new THREE.OrbitControls(camera);
	//cameraCtrl.center=new THREE.Vector3(0, 0, 0);

	// ライトの作成
	// todo カットオフ角度をモデル依存にする
	var light = new THREE.SpotLight(0xffffff, 1.0, 0, Math.PI / 2, 10);
	//var light=new THREE.DirectionalLight(0xffffff, 1.0);
	var lightz = 20 * modelTop;
	if(modelTop < 6.0) {
		lightz = 20 * 6;
	}
	light.position.set(modelLength, modelLength, lightz);
	light.castShadow = true;
	light.shadowCameraVisible = false;
	light.shadowMapWidth = 2048;
	light.shadowMapHeight = 2048;
	scene.add(light);
	//lightHelper = new THREE.DirectionalLightHelper(light, 100);
	//scene.add(lightHelper);


	var brain = new THREE.Geometry();
	// 頂点
	for(var i = 0; i < vert.length; i++) {
		brain.vertices.push(new THREE.Vector3(vert[i][0], vert[i][1], vert[i][2]));
	}

	// 面
	for(var i = 0; i < face.length; i++){
		brain.faces.push(new THREE.Face3(face[i][0], face[i][1], face[i][2]));
	}

	// 材料
	var brainMaterial = new THREE.MeshLambertMaterial({
		color: 'lightseagreen', specular: 0xffffff, shininess: 50,
		side: THREE.DoubleSide, shading: THREE.FlatShading
	});


	// 法線ベクトル
	brain.computeFaceNormals();
	brain.computeVertexNormals();
	// メッシュオブジェクト作成
	var brainMesh = new THREE.Mesh(brain, brainMaterial);
	brainMesh.position.set(0, 0, 0);
	brainMesh.castShadow = true;

	// 床オブジェクトの作成
	var plane = new THREE.Mesh(
	new THREE.CubeGeometry(10*modelLength, 10*modelLength, 1, 100, 100),
	new THREE.MeshLambertMaterial({ color: 0xcccccc })
	);
	plane.receiveShadow = true;
	plane.position.set(0, 0, modelBottom-0.5);

	// メッシュをsceneへ追加
	scene.add(brainMesh);
	scene.add(plane);

	// レンダリング
	var step = 0;
	function render() {
		requestAnimationFrame(render); 
		//cameraCtrl.update();
		var camz = modelTop + 200;
		if(modelTop < 6.0){
			camz = 230;
		}
		camera.position = new THREE.Vector3(3*modelLength * Math.cos(0.005 * step), 3*modelLength * Math.sin(0.005 * step), camz);
		//camera.position.set(500 * Math.cos(0.005 * step), 500 * Math.sin(0.005 * step), 2 * modelTop);
		camera.lookAt(new THREE.Vector3(0, 0, 0));
		renderer.render(scene, camera);
		++step;
	};

	render();

}
