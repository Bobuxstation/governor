// Create a scene
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000000);
camera.position.set(5, 5, 0);
camera.lookAt(scene.position);
window.createImageBitmap = null

// Create a renderer
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

var controls = new THREE.OrbitControls(camera, renderer.domElement);
var composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));

// pixelated filter
var renderPixelatedPass = new THREE.RenderPixelatedPass(2, scene, camera);
renderPixelatedPass.depthEdgeStrength = 0.1;
renderPixelatedPass.normalEdgeStrength = 0.1;
//composer.addPass(renderPixelatedPass);

// Render the scene
function animate() {
    controls.update()
    composer.render(scene, camera);
    requestAnimationFrame(animate)
}

animate();

//resize window
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize, false);