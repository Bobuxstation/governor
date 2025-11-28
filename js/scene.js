function newBlankScene(terrainSize, seed) {
    let ImprovedNoise = new THREE.ImprovedNoise();
    let scene = [];
    let index = 0;

    // traverse size
    for (var x = 0; x < terrainSize; x++) {
        scene[x] = scene[x] ? scene[x] : [];
        for (var y = 0; y < terrainSize; y++) {
            let random = mulberry32(parseInt(`${x}${y}${seed}`));
            let random2 = mulberry32(parseInt(`${index}${seed}`));
            let type = 0; // plains
            let additionalData = {};
            let height = parseFloat(ImprovedNoise.noise(x / 20, seed, y / 20).toFixed(3));

            if (x == Math.floor(terrainSize / 2)) {
                type = 2; // road
            } else {
                if (random < 0.025) {
                    type = 1; // foliage
                    additionalData["foliageType"] = foliage[Math.floor(random2 * foliage.length)];
                }
            }

            scene[x][y] = { type: type, index: index, height: height, ...additionalData };
            index++;
        }
    }

    return scene;
};

// load obj building models
async function loadWMat(location) {
    let mtlloader = new THREE.MTLLoader();
    loaded[`${location}.mtl`] ??= await mtlloader.loadAsync(`${location}.mtl`)

    let objloader = new THREE.OBJLoader();
    objloader.setMaterials(loaded[`${location}.mtl`]);
    loaded[`${location}.obj`] ??= await objloader.loadAsync(`${location}.obj`);

    let object = loaded[`${location}.obj`].clone();
    object.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
    })

    return object;
}

async function generateGrid(data) {
    // instance for checkerboard grid
    let terrainSize = data.length;
    let material = new THREE.MeshToonMaterial({ color: 0xffffff });
    let geometry = new THREE.BoxGeometry(1, 0.25, 1);
    let instance = new THREE.InstancedMesh(geometry, material, terrainSize * terrainSize);
    instance.castShadow = true;
    instance.receiveShadow = true;

    // traverse data
    let index = 0;
    for (var x = 0; x < terrainSize; x++) {
        for (var y = 0; y < terrainSize; y++) {
            let itemData = data[x][y];

            // checkerboard geometry
            let dummy = new THREE.Object3D();
            dummy.position.set((x - (terrainSize / 2)), itemData.height, (y - (terrainSize / 2)));
            dummy.updateMatrix();
            instance.setMatrixAt(index, dummy.matrix);

            //checkerboard color
            let color = new THREE.Color();
            color.set((x + y) % 2 === 0 ? 0x008000 : 0x007000);
            instance.setColorAt(index, color);

            //spawn things above it
            let gltfloader = new THREE.GLTFLoader();

            //tile mesh pos
            let posX = (x - (terrainSize / 2));
            let posZ = (y - (terrainSize / 2));
            itemData["posX"] = posX;
            itemData["posY"] = itemData.height;
            itemData["posZ"] = posZ;

            if (itemData.type == 1) {
                loaded[itemData.foliageType] ??= await gltfloader.loadAsync(itemData.foliageType);

                let cloned = loaded[itemData.foliageType].scene.clone();
                cloned.position.set(posX, itemData.height, posZ);
                cloned.traverse((child) => {
                    if (!child.isMesh) return;
                    child.castShadow = true;
                    child.receiveShadow = true;
                })

                meshLocations[index] = cloned;
                scene.add(cloned);
            } else if (itemData.type == 2) {
                color.set(0x111111);
                instance.setColorAt(index, color);

                let object = await loadWMat("assets/roads/road_straight");
                object.position.set(posX, itemData.height + 0.12, posZ);
                object.scale.setScalar(0.156);

                meshLocations[index] = object;
                scene.add(object);
            };

            index++;
        }
    }

    scene.add(instance);
    return instance;
};

// Set up lights and sky
function allOfTheLights() {
    // create hemisphere light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // create directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(0, 1.75, -1.75);
    dirLight.position.multiplyScalar(30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 8192;
    dirLight.shadow.mapSize.height = 8192;
    dirLight.shadow.camera.left = - 50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = - 50;
    dirLight.shadow.camera.far = 3500;
    dirLight.shadow.bias = - 0.00001;
    scene.add(dirLight);

    // create ambient light
    const light = new THREE.AmbientLight(0x404040);
    scene.add(light);

    // create sky
    const sky = new THREE.Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    Object.assign(sky.material.uniforms, {
        turbidity: { value: 10 },
        rayleigh: { value: 3 },
        mieCoefficient: { value: 0.005 },
        mieDirectionalG: { value: 0.7 }
    });

    // create sun on sky
    const sun = new THREE.Vector3();
    sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 2), THREE.MathUtils.degToRad(180));
    sky.material.uniforms.sunPosition.value.copy(sun);
}

let meshLocations, sceneData, gridInstance, worldSeed
async function initScene() {
    worldSeed = Math.random();
    meshLocations = {};
    sceneData = newBlankScene(32, Math.floor(worldSeed * 100000));
    gridInstance = await generateGrid(sceneData);
    allOfTheLights();
    citizenSimulation(worldSeed);
};
initScene()