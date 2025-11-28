let housingDemand = 0, commercialDemand = 0, IndustrialDemand = 0, FarmlandDemand = 0;
async function citizenSimulation(seed) {
    // increase housing demand under these conditions
    // - its less than the max limit
    // - no empty housing lots
    if (housingDemand < 100 && findZone("housing", true) == false) {
        housingDemand += 1;
    };

    // occupy a house
    let tile = findZone("housing", true, true);
    if (tile) {
        let connectedRoad = checkNeighborForRoads(tile["posX"], tile["posZ"], true);
        let houseType = houses[Math.floor(Math.random() * houses.length)];

        if (!connectedRoad) return;
        
        tile.road = connectedRoad.road;
        tile.rot = connectedRoad.rot;
        tile.type = houseType;
        tile.occupied = true;

        let object = await loadWMat(houseType);
        object.position.set(tile["posX"], tile["posY"] + 0.12, tile["posZ"]);
        object.rotation.set(0, connectedRoad.rot, 0);
        object.scale.setScalar(0.156);
        
        scene.remove(meshLocations[tile.index]);
        scene.add(object);

        meshLocations[tile.index] += object;
        setInstanceColor(0x555555, gridInstance, tile.index);
    }

    setTimeout(citizenSimulation, 1000);
}

function checkNeighborForRoads(x, z, rand, all = false) {
    const north = sceneData.flat().find(item => item.posX == x && item.posZ == z + 1 && item.type == 2);
    const south = sceneData.flat().find(item => item.posX == x && item.posZ == z - 1 && item.type == 2);
    const east = sceneData.flat().find(item => item.posX == x + 1 && item.posZ == z && item.type == 2);
    const west = sceneData.flat().find(item => item.posX == x - 1 && item.posZ == z && item.type == 2);

    const directions = {};
    if (north) directions.north = north;
    if (south) directions.south = south;
    if (east) directions.east = east;
    if (west) directions.west = west;
    
    const directionRotation = {
        north: (Math.PI / 2),
        south: -(Math.PI / 2),
        east: Math.PI,
        west: Math.PI * 2
    };

    if (all) {
        return directions;
    }

    if (Object.values(directions).length > 0) {
        if (rand) {
            const pick = Math.floor(Math.random() * Object.values(directions).length);
            return {
                tile: Object.values(directions)[pick],
                direction: Object.keys(directions)[pick],
                rot: directionRotation[Object.keys(directions)[pick]],
            };
        } else {
            return {
                tile: Object.values(directions)[0],
                direction: Object.keys(directions)[0],
                rot: directionRotation[Object.keys(directions)[0]]
            };
        }
    }

    return false;
}

function findZone(zone, occupied, checkRoad) {
    const matches = sceneData.flat().filter(item => item.zone === zone);

    for (let i = matches.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [matches[i], matches[j]] = [matches[j], matches[i]];
    }

    for (const match of matches) {
        if (match.occupied & occupied) continue;
        if (checkRoad && !checkNeighborForRoads(match.posX, match.posZ, true)) continue;
        return match;
    }

    return false;
}