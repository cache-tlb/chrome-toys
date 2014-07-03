var displacementMap, displacementMapOld, displacementMesh;
var displacementMaterial, addDropMaterial, updateMaterial;
var positive = 1;
var cameraRTT, sceneRTT;
//var bg = THREE.ImageUtils.loadTexture("./cloud.jpg");

var planeShader = {
	uniforms: {
		tDiffuse: { type: "t", value: null },
		heightMap: { type: "t", value: null },
		height: {type: "f", value: 0},
		width: {type: "f", value: 0},
		waterDepth: {type: "f", value: 0},
		scrollTop: {type: "f", value: 0},
		scrollLeft: {type: "f", value: 0},
		scrollHeight: {type: "f", value: 0},
		scrollWidth: {type: "f", value: 0}
	},

	vertexShader: [
		"varying vec2 vUv;",
		"varying vec3 pos;",
		"void main() {",
			"vUv = uv;",
			"pos = position;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"
	].join("\n"),

	fragmentShader: [
		"const float IOR_AIR = 1.0;",
		"const float IOR_WATER = 1.333;",
		"const vec3 abovewaterColor = vec3(0.4, 0.9, 1.0);",
		"uniform float waterDepth;",
		"uniform float height;",
		"uniform float width;",
		"uniform float scrollTop;",
		"uniform float scrollLeft;",
		"uniform float scrollHeight;",
		"uniform float scrollWidth;",
		"uniform sampler2D tDiffuse;",
		"uniform sampler2D heightMap;",
		"varying vec2 vUv;",
		"varying vec3 pos;",

		"void main() {",
			"vec4 info = texture2D(heightMap, vUv);",
			"vec2 coord = vUv;",
			"for (int i = 0; i < 5; i++) {",
				"coord += info.ba * 0.005;",
				"info = texture2D(heightMap, coord);",
			"}",
			"vec3 normal = vec3(info.b, info.a, sqrt(1.0 - dot(info.ba, info.ba)));",
			"vec3 incommingRay = vec3(0.0, 0.0, -1.0);",
			"vec3 refractedRay = refract(incommingRay, normal, IOR_AIR / IOR_WATER);",
			"float t = -1.0 * waterDepth / refractedRay.z;",
			"vec2 floorCoord = pos.xy + t * refractedRay.xy + vec2(width * 0.5 + scrollLeft, height * 0.5 + scrollHeight - height - scrollTop);",
			"vec2 page_coord = vec2(floorCoord.x / scrollWidth, floorCoord.y / scrollHeight);",
			"gl_FragColor = texture2D(tDiffuse, page_coord) * vec4(abovewaterColor, 1.0);",
			//"gl_FragColor = vec4(abs(page_coord.xy), 0.0, 1.0);",
			// "info = texture2D(heightMap, vUv);",
			// "gl_FragColor.r=(info.r)*1000.0;",
			// "gl_FragColor.g=(-info.r)*1000.0;",
			// "gl_FragColor.b=0.0;",
			// "gl_FragColor.a=1.0;",
		"}"
	].join("\n")
};

va = {
	uniforms: {
		tDiffuse: { type: "t", value: null },
		delta: {type: "v2", value: null }
	},
	vertexShader: [
		"varying vec2 vUv;",
		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"
	].join("\n"),

	fragmentShader: [
		"varying vec2 vUv;",
		"uniform vec2 delta;",
		"uniform sampler2D tDiffuse;",
		"void main() {",
			"vec4 info = texture2D(tDiffuse, vUv);",
			"vec3 dx = vec3(delta.x, texture2D(tDiffuse, vec2(vUv.x + delta.x, vUv.y)).r - info.r, 0.0);",
			"vec3 dy = vec3(0.0, texture2D(tDiffuse, vec2(vUv.x, vUv.y + delta.y)).r - info.r, delta.y);",
			"info.ba = normalize(cross(dy, dx)).xz;",
			"gl_FragColor = info;",
		"}"
	].join("\n")
};

var dropShader = {
	uniforms: {
		tDiffuse: {type : "t", value: null},
		center: {type: "v2", value: null},
		radius: {type: "f", value: 0.03},
		strength: {type: "f", value: 0.01},
		delta: {type: "v2", value: null}
	},

	vertexShader: [
		"varying vec2 vUv;",
		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"
	].join("\n"),

	fragmentShader: [
		"const float PI = 3.141592653589793;",
		"varying vec2 vUv;",
		"uniform sampler2D tDiffuse;",
		"uniform vec2 center;",
		"uniform vec2 delta;",
		"uniform float radius;",
		"uniform float strength;",
		"void main() {",
			"vec4 info = texture2D(tDiffuse, vUv);",
			"vec2 dist = center - vUv;",
			"dist.x *= (delta.x + delta.y) / delta.x;",
			"dist.y *= (delta.x + delta.y) / delta.y;",
			"float drop = max(0.0, 1.0 - length(dist) / radius);",
			"drop = 0.5 - cos(drop * PI) * 0.5;",
			"info.r += drop * strength;",
			"gl_FragColor = info;",
		"}"
	].join("\n")
};

var updateShader = {
	uniforms: {
		tDiffuse: { type: "t", value: null},
		delta: {type: "v2", value: null}
	},
	vertexShader: [
		"varying vec2 vUv;",
		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"
	].join("\n"),
	fragmentShader: [
		"uniform sampler2D tDiffuse;",
		"uniform vec2 delta;",
		"varying vec2 vUv;",
		"void main() {",
			"vec4 info = texture2D(tDiffuse, vUv);",
			"vec2 dx = vec2(delta.x, 0.0);",
			"vec2 dy = vec2(0.0, delta.y);",
			"float average = (",
				"texture2D(tDiffuse, vUv - dx).r +",
				"texture2D(tDiffuse, vUv - dy).r +",
				"texture2D(tDiffuse, vUv + dx).r +",
				"texture2D(tDiffuse, vUv + dy).r",
			") * 0.25;",
			"info.g += (average - info.r) * 2.0;",
			"info.g *= 0.995;",
			"info.r += info.g;",
			"gl_FragColor = info;",
		"}"
	].join("\n")
};

var body = document.body,
    html = document.documentElement;

// please init these to variables after the page is loaded
//var h = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
//var w = Math.max( body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth );
var w = (document.documentElement.clientWidth ||document.clientWidth || window.innerWidth);
var h = (document.documentElement.clientHeight ||document.clientHeight || window.innerHeight);
var fullImage;

var bg = null;

var canvas = document.createElement('canvas');
canvas.id = "ripple_canvas";
var canvasContainer = document.createElement('div');
canvasContainer.appendChild(canvas);
document.body.appendChild(canvasContainer);

var renderer;
function initThree() {
	canvas.setAttribute('width', w);
	canvas.setAttribute('height', h);
	with ( canvas.style ) {
		position = "fixed";
		top = "0px";
		left = "0px";
		bottom = "0px";
		right = "0px";
		zIndex = "10000";
	}
	width = canvas.width;
	height = canvas.height;
	renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas, alpha: true});
	//document.body.appendChild(renderer.domElement);
	renderer.setClearColor(0x000000, 1.0);
}

var camera;
function initCamera() {
	//camera = new THREE.PerspectiveCamera( 45 , width / height , 1 , 10000 );
	camera = new THREE.OrthographicCamera( -width/2, width/2, height/2, -height/2, -10, 10 );
	camera.position.z = 1;

	cameraRTT = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, -10000, 10000 );
	cameraRTT.position.z = 1;
}
var scene;
function initScene() {
	scene = new THREE.Scene();
	sceneRTT = new THREE.Scene();
}
var light;
function initLight() {
	light = new THREE.DirectionalLight(0xFFFFFF, 1.0, 0);
	light.position.set( 0, 0, 1 );
	scene.add(light);
}

var quad;
function initObject(){

	displacementMap = new THREE.WebGLRenderTarget( width, height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.FloatType } );
	displacementMapOld = displacementMap.clone();
	displacementMaterial =  new THREE.ShaderMateria);
	addDropMaterial = new THREE.ShaderMaterial(dropShader);
	updateMaterial = new THREE.ShaderMaterial(updateShader);
	displacementMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), displacementMaterial);
	sceneRTT.add(displacementMesh);

	quad = new THREE.Mesh(
		new THREE.PlaneGeometry(width, height),
		new THREE.ShaderMaterial(planeShader)
		//new THREE.MeshBasicMaterial( { color: 0xffffff, map: displacementMap } )
		//new THREE.MeshLambertMaterial({color: 0xFFFFFF, map: THREE.ImageUtils.loadTexture("./cloud.jpg"), shading: THREE.SmoothShading})
	);
	scene.add(quad);
	//quad.position.set(width/2,height/2,0);
}

function threeStart() {
	initThree();
	initCamera();
	initScene();
	initLight();
	initObject();
	//renderer.clear();
	//renderer.render(scene, camera);
}

function swapBuffers() {
	var tmp = displacementMapOld;
	displacementMapOld = displacementMap;
	displacementMap = tmp;
}
var delta = new THREE.Vector2(1.0/w, 1.0/h);
function updateDisplacement() {.uniforms.delta.value = delta;.uniforms.tDiffuse.value = displacementMap;
	displacementMesh.material = displacementMaterial;
	renderer.render(sceneRTT, cameraRTT, displacementMapOld, true);
	swapBuffers();
}

var isPause = false;

function pause() {
	isPause = !isPause;
}

function draw() {
	planeShader.uniforms.tDiffuse.value = bg;
	planeShader.uniforms.heightMap.value = displacementMap;
	planeShader.uniforms.height.value = height;
	planeShader.uniforms.width.value = width;
	planeShader.uniforms.scrollHeight.value = document.body.scrollHeight;
	planeShader.uniforms.scrollWidth.value = document.body.scrollWidth;
	planeShader.uniforms.scrollLeft.value = document.body.scrollLeft;
	planeShader.uniforms.scrollTop.value = document.body.scrollTop;
	planeShader.uniforms.waterDepth.value = (width + height) / 6.0;
	renderer.render( scene, camera );
}

function animate_() {
	requestAnimationFrame( animate_ );
	if (isPause) return;
	stepSimulation();
	updateDisplacement();
	draw();
	//renderer.render( sceneRTT, cameraRTT );
}
//animate();

function addDrop(x, y, radius, strength) {
	dropShader.uniforms.tDiffuse.value = displacementMap;
	dropShader.uniforms.center.value = new THREE.Vector2(x, y);
	dropShader.uniforms.delta.value = delta;
	dropShader.uniforms.radius.value = radius;
	dropShader.uniforms.strength.value = strength;
	displacementMesh.material = addDropMaterial;
	renderer.render(sceneRTT, cameraRTT, displacementMapOld, true);
	swapBuffers();
	draw();
}

function stepSimulation() {
	updateShader.uniforms.tDiffuse.value = displacementMap;
	updateShader.uniforms.delta.value = delta;
	displacementMesh.material = updateMaterial;
	renderer.render(sceneRTT, cameraRTT, displacementMapOld, true);
	swapBuffers();
}

var debug;

var onMouseDown = function (event) {
	event = event || window.event;
	debug = event;
	//positive = 1 - positive;
	addDrop(event.clientX/width, 1.0 - event.clientY/height, 0.03, positive ? 0.01 : -0.01);
};

var onKeyPress = function (event) {
	event = event || window.event;
	switch (String.fromCharCode(event.keyCode)) {
	case('h'):
		//canvas.style.visibility = 'hidden';
		//canvas.style.visibility = 'visible';
		document.body.removeChild(canvasContainer);
		break;
	case('v'):
		document.body.appendChild(canvasContainer);
		break;
	case('p'):
		pause();
		break;
	}
}

var onresize = function (event) {
	isPause = true;
	w = (document.documentElement.clientWidth ||document.clientWidth || window.innerWidth);
	h = (document.documentElement.clientHeight ||document.clientHeight || window.innerHeight);
	html2canvas(document.body, {
	  onrendered: function(canvas) {
		fullImage = canvas.toDataURL();
	  },
	  width: document.body.scrollWidth,
	  height: document.body.scrollHeight,
	  useCORS: true,
	  allowTaint:false
	});
	threeStart();
	bg = THREE.ImageUtils.loadTexture(fullImage);
	delta = new THREE.Vector2(1.0/w, 1.0/h);
	draw();
	isPause = false;
};

function addListerners() {
	document.onmousedown = onMouseDown;
	document.onkeypress = onKeyPress;
	window.addEventListener('resize', onresize);
}

addListerners();


var delayed_func = function () {
	// maybe all other stuff should be included inside this function
	html2canvas(document.body, {
	  onrendered: function(canvas) {
		fullImage = canvas.toDataURL();
	  },
	  width: document.body.scrollWidth,
	  height: document.body.scrollHeight,
	  useCORS: true,
	  allowTaint:false
	});
	threeStart();
	setTimeout ("bg = THREE.ImageUtils.loadTexture(fullImage);", 1000);
	requestAnimationFrame( animate_ );
}

setTimeout("delayed_func();", 1000);
