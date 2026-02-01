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
    // const zones = data[imageName];
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

    if (!zoneName.includes('_')) {
        console.error("Bad zone name:", zoneName);
        return;
    }

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
    updateResultsDisplay(zoneName, dieRoll, maneuvers);
}

function updateResultsDisplay(zoneName, dieRoll, maneuvers) {

    const zoneDiv = document.getElementById("clicked");
    const rollDiv = document.getElementById("rolled");
    const outputDiv = document.getElementById("maneuver-output");

    outputDiv.innerHTML = "";

    zoneDiv.innerHTML = `Zone: ${zoneName}`;
    rollDiv.innerHTML = `Die Roll: ${dieRoll}`;

    for (const maneuver of maneuvers) {

        const block = document.createElement("div");
        block.className = "maneuver-block";

        const text = document.createElement("div");
        text.textContent = maneuver;

        const parts = maneuver.trim().split(/\s+/);
        const speed = parts[0];
        const vector = parts.slice(1).join('-').toLowerCase();

        const imgRow = document.createElement("div");

        const img1 = document.createElement("img");
        const img2 = document.createElement("img");

        img1.src = `images/maneuvers/${speed}.png`;
        img2.src = `images/maneuvers/${vector}.png`;

        img1.className = "maneuver-icon";
        img2.className = "maneuver-icon";

        imgRow.appendChild(img1);
        imgRow.appendChild(img2);

        // Assemble
        block.appendChild(text);
        block.appendChild(imgRow);
        outputDiv.appendChild(block);
    }
}


function roll6SidedDie() {
    return (Math.floor(Math.random() * 6) + 1);
};
