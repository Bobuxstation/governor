// select tiles
async function select(event, duration) {
    if (duration > 250) return;

    var mouse = new THREE.Vector2();
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = - (event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        var selectedObject = intersects[0].object;

        if (selectedObject instanceof THREE.InstancedMesh) {
            let index = intersects[0].instanceId;
            let tile = sceneData.find((element) =>
                element.find((index) =>
                    index.index == intersects[0].instanceId
                )
            ).find((index) => index.index == intersects[0].instanceId);

            switch (tool.category) {
                case "zones":
                    // remove foliage
                    if (tile.type == 3 & tile.zone == tool.type) return;
                    if (tile.type == 1) scene.remove(meshLocations[index]);

                    tile.type = 3; //zoned for buildings
                    tile.zone = tool.type;
                    tile.occupied = false;

                    // add billboard to tile
                    let object = await loadWMat(`assets/zoning/${tool.type}`);
                    object.position.set(tile["posX"], tile["posY"] + 0.12, tile["posZ"]);
                    object.scale.setScalar(0.156);

                    scene.add(object);
                    meshLocations[index] = object;
                    break;
                case "building":
                    tile.type = 4; // pre made buildings
                    tile.building = tool.type;
                    break;
                case "road": placeRoad(tile); break;
            }
        }
    }
}

renderer.domElement.addEventListener('mousedown', () => { st = Date.now(); });
renderer.domElement.addEventListener('mouseup', (e) => { if (st) select(e, Date.now() - st); });
let st = 0;

// build tab mode
let tool = {};
function setTool(type, category) {
    tool["type"] = type;
    tool["category"] = category;
}

// set color of tile
function setInstanceColor(color, instance, index) {
    instance.setColorAt(index, (new THREE.Color()).set(color));
    instance.instanceColor.needsUpdate = true;
}

// render road model on tile following neighbors
async function setRoadModel(directions, tile) {
    let object

    if (meshLocations[tile.index]) scene.remove(meshLocations[tile.index]);
    if (Object.values(directions).length > 3) {
        // 4 way intersection
        object = await loadWMat("assets/roads/road_intersection_4");
    } else if (Object.values(directions).length == 3) {
        // 3 way intersection
        object = await loadWMat("assets/roads/road_intersection_3");

        let north = typeof directions.north == "undefined";
        let east = typeof directions.east == "undefined";
        let south = typeof directions.south == "undefined";
        let west = typeof directions.west == "undefined";

        if (north) {
            object.rotation.set(0, Math.PI * 1.5, 0);
        } else if (south) {
            object.rotation.set(0, Math.PI / 2, 0);
        } else if (east) {
            object.rotation.set(0, Math.PI * 2, 0);
        } else if (west) {
            object.rotation.set(0, Math.PI, 0);
        }
    } else {
        let northwest = typeof directions.north != "undefined" && typeof directions.west != "undefined";
        let northeast = typeof directions.north != "undefined" && typeof directions.east != "undefined";
        let southwest = typeof directions.south != "undefined" && typeof directions.west != "undefined";
        let southeast = typeof directions.south != "undefined" && typeof directions.east != "undefined";

        if (northwest || northeast || southwest || southeast) {
            // turn road
            object = await loadWMat("assets/roads/road_intersection_turn");

            if (northwest) {
                object.rotation.set(0, Math.PI * 2, 0);
            } else if (northeast) {
                object.rotation.set(0, Math.PI / 2, 0);
            } else if (southwest) {
                object.rotation.set(0, Math.PI * 1.5, 0);
            } else if (southeast) {
                object.rotation.set(0, Math.PI, 0);
            }
        } else {
            // straight road
            object = await loadWMat("assets/roads/road_straight");

            if (typeof directions.east != "undefined" || typeof directions.west != "undefined") {
                object.rotation.set(0, Math.PI / 2, 0);
            }
        }
    }

    object.position.set(tile["posX"], tile["posY"] + 0.12, tile["posZ"]);
    object.scale.setScalar(0.1565);
    scene.add(object);
    meshLocations[tile.index] = object;
}

// place road on tile and update neighbors
function placeRoad(tile) {
    tile.type = 2;
    setInstanceColor(0x111111, gridInstance, tile.index);

    let neighbors = checkNeighborForRoads(tile["posX"], tile["posZ"], false, true);
    setRoadModel(neighbors, tile);

    Object.values(neighbors).forEach(tile => {
        let neighbors = checkNeighborForRoads(tile["posX"], tile["posZ"], false, true);
        setRoadModel(neighbors, tile);
    });
}