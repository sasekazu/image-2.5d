
function threeTrackball(containerID, width, height, vertices, face) {

	var oyadom = document.getElementById(containerID);
	var child;
	while(child = oyadom.lastChild) oyadom.removeChild(child);

	if(!Detector.webgl) Detector.addGetWebGLMessage();
	var container;
	var camera, controls, scene, renderer;
	var cross;
	init();
	animate();
	function init() {
		container = document.getElementById(containerID);
		camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
		camera.position.z = 40;
		controls = new THREE.TrackballControls(camera, container);
		controls.rotateSpeed = 10.0;
		controls.zoomSpeed = 2.0;
		controls.panSpeed = 2.0;
		controls.noZoom = false;
		controls.noPan = false;
		controls.staticMoving = true;
		controls.dynamicDampingFactor = 0.3;
		controls.keys = [65, 83, 68];
		controls.addEventListener('change', render);
		// world
		scene = new THREE.Scene();
		scene.fog = new THREE.FogExp2(0xeeeeee, 0.002);

		var geometry = new THREE.Geometry();
		for(var i = 0; i < vertices.length; i++) {
			geometry.vertices.push(new THREE.Vector3(vertices[i][0], vertices[i][1], vertices[i][2]));
		}
		for(var i = 0; i < face.length; i++) {
			geometry.faces.push(new THREE.Face3(face[i][0], face[i][1], face[i][2]));
		}
		var material = new THREE.MeshLambertMaterial({
			color: 'lightseagreen', specular: 0xffffff, shininess: 50,
			side: THREE.DoubleSide, shading: THREE.FlatShading
		});
		geometry.computeFaceNormals();
		geometry.computeVertexNormals();
		var mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(0, 0, 0);
		mesh.castShadow = true;
		scene.add(mesh);

		// lights
		light = new THREE.DirectionalLight(0xffffff);
		light.position.set(1, 1, 1);
		scene.add(light);
		light = new THREE.DirectionalLight(0x002288);
		light.position.set(-1, -1, -1);
		scene.add(light);
		light = new THREE.AmbientLight(0x222222);
		scene.add(light);
		// renderer
		renderer = new THREE.WebGLRenderer({ antialias: false });
		renderer.setClearColor(scene.fog.color);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(width, height);
		container.appendChild(renderer.domElement);
		//
		window.addEventListener('resize', onWindowResize, false);
		//
		render();
	}
	function onWindowResize() {
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height);
		controls.handleResize();
		render();
	}
	function animate() {
		requestAnimationFrame(animate);
		controls.update();
	}
	function render() {
		renderer.render(scene, camera);
	}

}
