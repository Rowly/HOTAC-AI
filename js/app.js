let zonesCache = null;
let maneuverCache = {};
let currentShip = null;


async function getZonesData() {

    if (zonesCache !== null) {
        return zonesCache;
    }

    const response = await fetch('data/zones.json');
    if (!response.ok) {
        throw new Error("Failed to load zones.json");
    }

    zonesCache = await response.json();
    return zonesCache;
}

async function getManeuverData(shipName) {

    if (maneuverCache[shipName]) {
        return maneuverCache[shipName];
    }

    const response = await fetch(`data/${shipName}.json`);
    if (!response.ok) {
        throw new Error(`Failed to load ${shipName}.json`);
    }

    const data = await response.json();
    maneuverCache[shipName] = data;
    return data;
}

const vehicleButtons = document.querySelectorAll('.ship-btn');
vehicleButtons.forEach(button => {
    button.addEventListener('click', () => {
        const shipName = button.getAttribute('data-ship');
        loadShipBoard(shipName);
    });
});

function loadShipBoard(shipName) {
    currentShip = shipName.toLowerCase();
    document.getElementById("main-image").src = `images/${currentShip}.png`;
    loadZones(`${currentShip}.png`);
}

async function loadZones(imageName) {

    const data = await getZonesData();
    const zones = data;

    if (!zones) {
        console.warn(`No zones for ${imageName}`);
        return;
    }

    const svg = document.getElementById("overlay");
    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 700 700");

    for (const [zoneName, points] of Object.entries(zones)) {

        const polygon = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "polygon"
        );

        polygon.setAttribute("points", points);
        polygon.setAttribute("class", "zone");

        polygon.addEventListener("click", () => {
            handleZoneClick(zoneName);
        });

        svg.appendChild(polygon);
    }
}

async function handleZoneClick(zoneName) {

    const dieRoll = roll6SidedDie();
    const shipManeuvers = await getManeuverData(currentShip);

    const baseManeuvers = getManeuvers(zoneName, shipManeuvers, dieRoll);
    const swerveZones = getServes(zoneName);

    const results = [];

    for (const maneuver of baseManeuvers) {

        const swerveManeuvers = [];
        const bearing = getBearingFromManeuver(maneuver);

        for (const swerveZone of swerveZones) {

            const swerveResults = getManeuvers(
                swerveZone,
                shipManeuvers,
                dieRoll
            );

            for (const swerve of swerveResults) {

                const swerveBearing = getBearingFromManeuver(swerve);
                if (bearing === null || swerveBearing === null || bearing === swerveBearing ) {
                    swerveManeuvers.push(swerve);
                }
            }
        }

        results.push({
            main: maneuver,
            swerve: swerveManeuvers
        });
    }
    updateResultsDisplay(zoneName, dieRoll, results);
}

function updateResultsDisplay(zoneName, dieRoll, results) {

    const zoneDiv = document.getElementById("clicked");
    const rollDiv = document.getElementById("rolled");
    const outputDiv = document.getElementById("maneuver-output");

    outputDiv.innerHTML = "";

    zoneDiv.textContent = `Zone: ${zoneName}`;
    rollDiv.textContent = `Die Roll: ${dieRoll}`;

    for (const result of results) {

        const block = document.createElement("div");
        block.className = "maneuver-block";

        // === MAIN MANEUVER ===
        block.appendChild(createTitle("Maneuver Generated"));
        block.appendChild(createText(result.main));
        block.appendChild(createImageRow(result.main));

        // === SWERVE MANEUVER ===
       if (result.swerve && result.swerve.length > 0) {
            block.appendChild(createTitle("Swerve Generated"));
            for (const swerve of result.swerve) {
                block.appendChild(createText(swerve));
                block.appendChild(createImageRow(swerve));
            }
        }
        outputDiv.appendChild(block);
    }
}


function getManeuvers(zoneName, shipManeuvers, dieRoll) {
    const arc = zoneName.split('_')[0];
    const range = zoneName.split('_')[1];

    let maneuvers = [];

    if (['forwardquarter', 'rearquarter', 'abeam'].includes(arc)) {
        maneuvers.push(
            shipManeuvers[arc][range]['target_side_right'][dieRoll]
        );
        maneuvers.push(
            shipManeuvers[arc][range]['target_side_left'][dieRoll]
        );
        if (maneuvers[0] === maneuvers[1]) {
            maneuvers = [maneuvers[0]];
        }
    } else {
        maneuvers.push(
            shipManeuvers[arc][range][dieRoll]
        );
    }
    return maneuvers;
}

function getServes(zoneName) {

    const swerveMap = {
        'front_green': ['forwardquarter_green'],
        'front_red': ['forwardquarter_red'],
        'rear_green': ['rearquarter_green'],
        'rear_red': ['rearquarter_red'],
        'abeam_green': ['forwardquarter_green', 'rearquarter_green'],
        'abeam_red': ['forwardquarter_red', 'rearquarter_red'],
        'forwardquarter_green': ['front_green', 'abeam_green'],
        'forwardquarter_red': ['front_red', 'abeam_red'],
        'rearquarter_green': ['rear_green', 'abeam_green'],
        'rearquarter_red': ['rear_red', 'abeam_red']
    };

    return swerveMap[zoneName] || [];
}

function getBearingFromManeuver(text) {

    const lower = text.toLowerCase();

    if (lower.includes("right")) return "right";
    if (lower.includes("left")) return "left";

    return null; // straight, stop, etc
}

function roll6SidedDie() {
    return (Math.floor(Math.random() * 6) + 1);
};

function createTitle(text) {
    const el = document.createElement("h4");
    el.textContent = text;
    return el;
}

function createText(text) {
    const el = document.createElement("div");
    el.textContent = text;
    return el;
}

function createImageRow(maneuverText) {

    const parts = maneuverText.trim().split(/\s+/);
    const speed = parts[0];
    const vector = parts.slice(1).join('-').toLowerCase();

    const row = document.createElement("div");

    const img1 = document.createElement("img");
    img1.src = `images/maneuvers/${speed}.png`;
    img1.className = "maneuver-icon";

    const img2 = document.createElement("img");
    img2.src = `images/maneuvers/${vector}.png`;
    img2.className = "maneuver-icon";

    row.appendChild(img1);
    row.appendChild(img2);

    return row;
}
