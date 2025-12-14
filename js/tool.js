// select tiles
async function select(event, duration) {
    var mouse = new THREE.Vector2();
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = - (event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera)

    var intersectsGrid = false;
    var intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length == 0 || duration > 250) return;

    intersects.forEach(async item => {
        if (item.object != gridInstance || intersectsGrid) return;
        let index = item.instanceId;
        let tile = sceneData.find((element) => element.find((item) => item.index == index)).find((item) => item.index == index);

        intersectsGrid = true;

        switch (tool.category) {
            case "zones":
                // remove foliage
                if (tile.type == 3 & tile.zone == tool.type) return;
                cleanTileData(tile)

                tile.type = 3; //zoned for buildings
                tile.zone = tool.type;
                tile.occupied = false;

                // add billboard to tile
                let object = await loadWMat(`assets/zoning/${tool.type}`);
                object.position.set(tile["posX"], tile["posY"] + 0.12, tile["posZ"]);
                object.scale.setScalar(0.156);

                scene.add(object);
                animMove(object, true);

                meshLocations[index] = object;
                break;
            case "building":
                cleanTileData(tile)
                tile.type = 4; // pre made buildings
                tile.building = tool.type;
                break;
            case "demolish": cleanTileData(tile, true); break;
            case "road": placeRoad(tile); break;
        }
    })
}

// capture mouse for selection
renderer.domElement.addEventListener('mousedown', () => { st = Date.now(); });
renderer.domElement.addEventListener('mouseup', (e) => { if (st) select(e, Date.now() - st); });
let st = 0;

// remove additional information from tile
function cleanTileData(tile, resetType = false) {
    if (tile.building) delete tile.building;
    if (tile.zone) delete tile.zone;
    if (tile.foliageType) delete tile.foliageType;
    if (tile.uuid) delete tile.uuid;

    if (Object.keys(citizens).find(item => item == tile.index)) {
        delete citizens[tile.index];
    }

    if (resetType & typeof meshLocations[tile.index] != "undefined") {
        animMove(meshLocations[tile.index], false);
        setTimeout(() => {
            // update neighboring roads
            Object.values(checkNeighborForRoads(tile["posX"], tile["posZ"], false, true)).forEach(tile => {
                setRoadModel(checkNeighborForRoads(tile["posX"], tile["posZ"], false, true), tile, true);
            });

            setInstanceColor((tile.posX + tile.posZ) % 2 === 0 ? 0x008000 : 0x007000, gridInstance, tile.index);
            if (meshLocations[tile.index]) {
                scene.remove(meshLocations[tile.index]);
                delete meshLocations[tile.index];
            };
        }, 500);
    } else {
        setInstanceColor((tile.posX + tile.posZ) % 2 === 0 ? 0x008000 : 0x007000, gridInstance, tile.index);
        if (meshLocations[tile.index]) scene.remove(meshLocations[tile.index]);
    }

    if (resetType) {
        tile.type = 0; // plains
        tile.occupied = false;
    }
}

// build tab mode
let tool = {};
function setTool(type, category) {
    let toolDiv = document.getElementById("tools");
    let selectDiv = document.getElementById("toolselected");
    let toolname = document.getElementById("toolname");
    let lastmenu = lastTab['tab'];

    renderer.domElement.style.cursor = 'crosshair';
    toolDiv.style.animation = "slideOutDown 0.25s both";
    toolname.innerText = `${category}${type ? ` - ${type}` : ""}`;
    
    openTab('', 'tab', true);
    tool["type"] = type;
    tool["category"] = category;

    setTimeout(() => {
        selectDiv.style.display = "block";
        toolDiv.style.display = "none";
        toolDiv.style.animation = "";
    }, 250);

    document.getElementById("hideTool").onclick = () => {
        selectDiv.style.animation = "slideOutDown 0.25s both";
        renderer.domElement.style.cursor = 'unset';

        openTab(lastmenu, 'tab', true);
        tool["type"] = '';
        tool["category"] = '';

        setTimeout(() => {
            selectDiv.style.display = "none";
            selectDiv.style.animation = "";
            toolDiv.style.display = "block";
        }, 250);
    };
}

// render road model on tile based on neighbors
async function setRoadModel(directions, tile, isUpdate = false) {
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
    if (isUpdate) return;

    animMove(object, true);
    setTimeout(() => setInstanceColor(0x222222, gridInstance, tile.index), 500);
}

// place road on tile and update neighbors
function placeRoad(tile) {
    tile.type = 2;
    cleanTileData(tile)

    let neighbors = checkNeighborForRoads(tile["posX"], tile["posZ"], false, true);
    setRoadModel(neighbors, tile);

    setTimeout(() => {
        Object.values(neighbors).forEach(tile => {
            setRoadModel(checkNeighborForRoads(tile["posX"], tile["posZ"], false, true), tile, true);
        });
    }, 500);
}