// Configuration
const API_BASE_URL = 'http://127.0.0.1:5000/api';
const SCALE_FACTOR = 1000; // Increased scale factor to spread planets further apart
const AU_TO_KM = 149597870.7; // 1 AU in km
const CELESTIAL_BODY_SCALE = 0.00005; // Dramatically reduced size
const MIN_PLANET_SIZE = 0.05; // Dramatically reduced minimum size

// Global variables
let scene, camera, renderer, controls;
let solarSystem, planets = {}, missionObjects = {};
let showOrbits = true;
let selectedMission = null;
let missions = [];
let celestialBodies = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    initThreeJS();
    await fetchData();
    setupEventListeners();
    animate();
});

// Initialize Three.js Scene
function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(
        60, // Field of view
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near clipping plane
        10000 // Far clipping plane
    );
    camera.position.set(0, 80, 100); // Adjusted camera position
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.7); // Adjust size to make room for UI
    renderer.setPixelRatio(window.devicePixelRatio);
    const container = document.getElementById('solar-system-container');
    container.appendChild(renderer.domElement);
    
    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // Add directional light (sunlight)
    const sunLight = new THREE.PointLight(0xffffff, 1.5);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    
    // Create solar system group
    solarSystem = new THREE.Group();
    scene.add(solarSystem);
    
    // Add stars background - improved distribution
    addStarsBackground();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.7); // Maintain size on resize
    });
}

// Add stars to the background - improved version
function addStarsBackground() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 1.2,
        sizeAttenuation: false
    });
    
    const starsVertices = [];
    // Use spherical distribution instead of cube and increase number of stars
    for (let i = 0; i < 25000; i++) {
        // Generate random spherical coordinates
        const radius = 1000 * Math.cbrt(Math.random()); // Cube root for better distribution
        const theta = Math.random() * Math.PI * 2; // Longitude
        const phi = Math.acos(2 * Math.random() - 1); // Latitude
        
        // Convert to Cartesian coordinates
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    
    // Log star creation for debugging
    console.log('Created stars background');
}

// Fetch data from the API
async function fetchData() {
    try {
        // Fetch missions data
        const missionsResponse = await fetch(`${API_BASE_URL}/missions`);
        missions = await missionsResponse.json();
        
        // Fetch celestial bodies data
        const celestialBodiesResponse = await fetch(`${API_BASE_URL}/celestial-objects`);
        celestialBodies = await celestialBodiesResponse.json();
        
        // Create the solar system visualization
        createSolarSystem();
        
        // Populate the missions list
        populateMissionsList();
        
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('missions-list').innerHTML = `
            <div class="error">Failed to load data. Please try again later.</div>
        `;
    }
}

// Create the solar system visualization
function createSolarSystem() {
    // Find the Sun in celestial bodies
    const sun = celestialBodies.find(body => body.id === "10");
    
    // Add the sun with proper scaling
    const sunSize = Math.max(MIN_PLANET_SIZE * 3, sun.diameter * CELESTIAL_BODY_SCALE);
    const sunGeometry = new THREE.SphereGeometry(sunSize, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    solarSystem.add(sunMesh);
    
    // Add a light glow effect around the sun
    const sunGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png'),
            color: 0xffff80,
            transparent: true,
            blending: THREE.AdditiveBlending
        })
    );
    sunGlow.scale.set(sunSize * 4, sunSize * 4, 1); // Scale glow according to sun size
    sunMesh.add(sunGlow);
    
    // Create a map to store planet order for proper distribution
    const planetOrder = {
        'Mercury': 1,
        'Venus': 2,
        'Earth': 3,
        'Mars': 4,
        'Jupiter': 5,
        'Saturn': 6,
        'Uranus': 7,
        'Neptune': 8,
        'Pluto': 9 // Included for completeness
    };
    
    // Add planets and other celestial bodies
    celestialBodies.forEach(body => {
        // Skip the sun as we've already added it
        if (body.id === "10") return;
        
        // Override distances for better visualization
        // This creates a more even spacing between planets
        let distanceMultiplier = 1;
        if (planetOrder[body.name]) {
            // Use fixed distances for known planets to ensure proper spacing
            switch(body.name) {
                case 'Mercury': distanceMultiplier = 8; break;
                case 'Venus': distanceMultiplier = 12; break;
                case 'Earth': distanceMultiplier = 16; break;
                case 'Mars': distanceMultiplier = 20; break;
                case 'Jupiter': distanceMultiplier = 28; break;
                case 'Saturn': distanceMultiplier = 36; break;
                case 'Uranus': distanceMultiplier = 44; break;
                case 'Neptune': distanceMultiplier = 52; break;
                case 'Pluto': distanceMultiplier = 60; break;
            }
        }
        
        // Calculate size with a minimum to ensure visibility
        const size = Math.max(MIN_PLANET_SIZE, body.diameter * CELESTIAL_BODY_SCALE);
        const geometry = new THREE.SphereGeometry(size, 32, 16);
        
        // Create a unique color based on the body type
        let color;
        switch (body.type) {
            case 'Planet':
                // Custom colors for planets to make them more distinguishable
                switch (body.name) {
                    case 'Mercury': color = new THREE.Color(0xA9A9A9); break; // Gray
                    case 'Venus': color = new THREE.Color(0xF4C2C2); break; // Light pink
                    case 'Earth': color = new THREE.Color(0x6B93D6); break; // Blue
                    case 'Mars': color = new THREE.Color(0xE27B58); break; // Red-orange
                    case 'Jupiter': color = new THREE.Color(0xD39C7E); break; // Light brown
                    case 'Saturn': color = new THREE.Color(0xEAD6B8); break; // Light gold
                    case 'Uranus': color = new THREE.Color(0xB2D8E5); break; // Light blue
                    case 'Neptune': color = new THREE.Color(0x4B70DD); break; // Dark blue
                    default: color = new THREE.Color(`hsl(${body.id % 360}, 70%, 60%)`);
                }
                break;
            case 'Dwarf Planet':
                color = new THREE.Color(0x8b8b8b);
                break;
            default:
                color = new THREE.Color(0xffffff);
        }
        
        const material = new THREE.MeshPhongMaterial({ color: color });
        const bodyMesh = new THREE.Mesh(geometry, material);
        
        // Store celestial body data in userData for reference by missions
        bodyMesh.userData = {
            id: body.id,
            name: body.name,
            type: body.type
        };
        
        // Position the body based on its distance from the sun
        // Using our custom distanceMultiplier instead of actual astronomical data
        const distance = distanceMultiplier; 
        
        // Distribute planets around the sun at different angles instead of in a line
        let angle = 0;
        
        // If it's a major planet, position it at a specific angle to avoid clustering
        if (planetOrder[body.name]) {
            // Distribute main planets evenly around a circle (not all in a line)
            angle = (planetOrder[body.name] * Math.PI * 0.25) % (Math.PI * 2);
        } else {
            // For other bodies, use a random angle
            angle = Math.random() * Math.PI * 2;
        }
        
        // Set position using polar coordinates
        bodyMesh.position.set(
            Math.cos(angle) * distance, // x
            0,                          // y
            Math.sin(angle) * distance  // z
        );
        
        // Add a text label for the planet
        const textSprite = createTextSprite(body.name);
        textSprite.position.set(0, size + 3, 0);
        bodyMesh.add(textSprite);
        
        // Add the body to the solar system
        solarSystem.add(bodyMesh);
        planets[body.id] = bodyMesh;
        
        // Create orbit line with better visibility
        const orbitGeometry = new THREE.BufferGeometry();
        const orbitMaterial = new THREE.LineBasicMaterial({ 
            color: 0x666666,
            transparent: true,
            opacity: 0.5
        });
        
        const orbitPoints = [];
        const segments = 128;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            orbitPoints.push(
                Math.cos(theta) * distance,
                0,
                Math.sin(theta) * distance
            );
        }
        
        orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitPoints, 3));
        const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
        orbit.visible = showOrbits;
        solarSystem.add(orbit);
        
        // Log planet creation for debugging
        console.log(`Created planet: ${body.name} at distance ${distance} and angle ${angle} radians (${angle * 180 / Math.PI} degrees)`);
    });
    
    // Add missions
    missions.forEach(mission => {
        if (mission.status === "Active") {
            fetchMissionPosition(mission.id);
        }
    });
    
    // Position camera to see more of the system
    camera.position.set(0, 100, 200);
    controls.update();
}

// Create a text sprite for labels
function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set larger canvas width for longer text
    const canvasWidth = Math.max(256, text.length * 14);
    canvas.width = canvasWidth;
    canvas.height = 128;
    
    context.font = "Bold 20px Arial";
    context.fillStyle = "rgba(255,255,255,0.95)";
    context.textAlign = 'center';
    context.fillText(text, canvasWidth / 2, 50);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    // Scale width proportionally to text length
    const width = 5 * (canvasWidth / 256);
    sprite.scale.set(width, 2.5, 1);
    return sprite;
}

// Fetch a mission's position and add it to the visualization
async function fetchMissionPosition(missionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/position/${missionId}`);
        const data = await response.json();
        
        if (data.status === "success" && data.position) {
            const position = data.position;
            
            // Create mission object
            const geometry = new THREE.SphereGeometry(0.3, 16, 8); // Slightly larger for visibility
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const missionObject = new THREE.Mesh(geometry, material);
            
            // Get the mission data
            const mission = missions.find(m => m.id === missionId);
            
            // Instead of using astronomical positions directly, we'll position missions 
            // using the same fixed orbital distances as planets
            let fixedPosition;
            
            // Map missions to their target planets or specific regions
            if (mission) {
                let targetDistance = 0;
                let angle = Math.random() * Math.PI * 2; // Default random angle
                
                // Match mission to a reasonable location based on name or target
                const missionName = mission.name.toLowerCase();
                
                if (missionName.includes("voyager")) {
                    // Voyagers are in outer solar system
                    targetDistance = 70; // Just beyond Neptune
                    
                    // Voyager 1 and 2 in different directions
                    if (missionName.includes("1")) {
                        angle = Math.PI * 0.25; // 45 degrees
                    } else if (missionName.includes("2")) {
                        angle = Math.PI * 1.75; // 315 degrees
                    }
                } 
                else if (missionName.includes("juno")) {
                    // Juno orbits Jupiter
                    targetDistance = 28; // Jupiter's distance
                    angle = Math.PI * 0.5; // 90 degrees offset from Jupiter
                }
                else if (missionName.includes("new horizons")) {
                    // New Horizons past Pluto
                    targetDistance = 65;
                    angle = Math.PI * 1.2; // Random position
                }
                else if (missionName.includes("parker")) {
                    // Parker Solar Probe near the Sun
                    targetDistance = 4;
                    angle = Math.PI * 0.8;
                }
                else if (missionName.includes("perseverance") || missionName.includes("curiosity")) {
                    // Mars rovers
                    targetDistance = 20; // Mars distance
                    angle = Math.PI * 0.1; // Close to Mars
                }
                else if (missionName.includes("insight")) {
                    // Another Mars mission
                    targetDistance = 20;
                    angle = Math.PI * 0.15;
                }
                else if (missionName.includes("cassini")) {
                    // Cassini (Saturn)
                    targetDistance = 36; // Saturn
                    angle = Math.PI * 0.9;
                }
                else if (missionName.includes("webb") || missionName.includes("telescope")) {
                    // Space telescopes typically at L2 point
                    targetDistance = 16.5; // Just beyond Earth
                    angle = Math.PI * 1.1;
                }
                else {
                    // Default positioning based on distance from sun
                    // Convert AU to our fixed distance scale (roughly)
                    const distance = Math.sqrt(position.x*position.x + position.y*position.y + position.z*position.z);
                    targetDistance = Math.min(80, Math.max(5, distance * 5)); // Clamp between 5-80
                }
                
                // Set position using our fixed distance and angle approach
                fixedPosition = new THREE.Vector3(
                    Math.cos(angle) * targetDistance,
                    0,
                    Math.sin(angle) * targetDistance
                );
            } else {
                // Fallback to a default position near the sun
                fixedPosition = new THREE.Vector3(5, 0, 5);
            }
            
            // Add small random offset to prevent exact overlaps
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            
            missionObject.position.copy(fixedPosition.add(offset));
            
            // Store mission info in userData
            missionObject.userData = {
                missionId,
                name: mission ? mission.name : "Unknown mission"
            };
            
            // Add a text label for the mission
            const textSprite = createTextSprite(mission ? mission.name : `Mission ${missionId}`);
            textSprite.position.set(0, 1, 0);
            missionObject.add(textSprite);
            
            // Add to solar system
            solarSystem.add(missionObject);
            missionObjects[missionId] = missionObject;
            
            // Fetch trajectory
            fetchMissionTrajectory(missionId);
        }
    } catch (error) {
        console.error(`Error fetching position for mission ${missionId}:`, error);
    }
}

// Fetch a mission's trajectory and add it to the visualization
async function fetchMissionTrajectory(missionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/trajectory/${missionId}?days=365`);
        const data = await response.json();
        
        if (data.status === "success" && data.trajectory && data.trajectory.length > 0) {
            // Instead of using the actual trajectory data, we'll create a simplified orbit
            // around the mission's current position
            const missionObject = missionObjects[missionId];
            if (!missionObject) return;
            
            const center = missionObject.position.clone();
            const size = 2; // Size of orbit
            
            // Create trajectory line as a small circle around the mission's position
            const trajectoryPoints = [];
            const segments = 32;
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                trajectoryPoints.push(
                    center.x + Math.cos(theta) * size,
                    center.y,
                    center.z + Math.sin(theta) * size
                );
            }
            
            const trajectoryGeometry = new THREE.BufferGeometry();
            trajectoryGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trajectoryPoints, 3));
            
            const trajectoryMaterial = new THREE.LineBasicMaterial({ 
                color: 0x00ff00,
                transparent: true,
                opacity: 0.7,
                linewidth: 1
            });
            
            const trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
            solarSystem.add(trajectoryLine);
        }
    } catch (error) {
        console.error(`Error fetching trajectory for mission ${missionId}:`, error);
    }
}

// Populate the missions list in the sidebar
function populateMissionsList() {
    const missionsList = document.getElementById('missions-list');
    missionsList.innerHTML = '';
    
    if (missions.length === 0) {
        missionsList.innerHTML = '<div class="error">No missions found.</div>';
        return;
    }
    
    // Get the mission item template
    const template = document.getElementById('mission-item-template');
    
    missions.forEach(mission => {
        if (mission.status === "Active") {
            // Clone the template
            const clone = document.importNode(template.content, true);
            
            // Set the mission data
            const missionItem = clone.querySelector('.mission-item');
            missionItem.dataset.id = mission.id;
            
            const missionName = clone.querySelector('.mission-name');
            missionName.textContent = mission.name;
            
            const missionAgency = clone.querySelector('.mission-agency');
            missionAgency.textContent = mission.agency;
            
            // Add click event
            missionItem.addEventListener('click', () => {
                selectMission(mission.id);
            });
            
            missionsList.appendChild(clone);
        }
    });
}

// Select a mission and show its details
function selectMission(missionId) {
    // Deselect previous mission
    const previouslySelected = document.querySelector('.mission-item.active');
    if (previouslySelected) {
        previouslySelected.classList.remove('active');
    }
    
    // Reset all mission objects to green
    Object.values(missionObjects).forEach(obj => {
        obj.material.color.set(0x00ff00);
    });
    
    // Select the new mission
    selectedMission = missions.find(m => m.id === missionId);
    
    // Highlight the mission in the list
    const missionItem = document.querySelector(`.mission-item[data-id="${missionId}"]`);
    if (missionItem) {
        missionItem.classList.add('active');
    }
    
    // Highlight the mission object in the visualization
    const missionObject = missionObjects[missionId];
    if (missionObject) {
        missionObject.material.color.set(0xff0000);
        
        // Focus camera on the mission
        const position = missionObject.position.clone();
        controls.target.copy(position);
        camera.position.set(
            position.x + 20,
            position.y + 20,
            position.z + 20
        );
        controls.update();
    }
    
    // Show mission details
    showMissionDetails(selectedMission);
}

// Show mission details in the sidebar
function showMissionDetails(mission) {
    const detailsContainer = document.getElementById('mission-details');
    
    if (!mission) {
        detailsContainer.innerHTML = '<h3>Select a mission to view details</h3>';
        return;
    }
    
    let milestonesHTML = '';
    if (mission.milestones && mission.milestones.length > 0) {
        milestonesHTML = '<h4>Mission Milestones</h4><div class="milestones">';
        mission.milestones.forEach(milestone => {
            milestonesHTML += `
                <div class="mission-milestone">
                    <strong>${milestone.date}</strong>: ${milestone.event}
                </div>
            `;
        });
        milestonesHTML += '</div>';
    }
    
    detailsContainer.innerHTML = `
        <h3>${mission.name}</h3>
        <div class="mission-detail">
            <strong>Agency:</strong> ${mission.agency}
        </div>
        <div class="mission-detail">
            <strong>Launch Date:</strong> ${mission.launch_date}
        </div>
        <div class="mission-detail">
            <strong>Status:</strong> ${mission.status}
        </div>
        <div class="mission-description">
            ${mission.description}
        </div>
        ${milestonesHTML}
        <div class="mission-links">
            <a href="${mission.website}" target="_blank" rel="noopener noreferrer">Official Website</a>
        </div>
    `;
    
    // Update info panel
    document.getElementById('info-title').textContent = mission.name;
    document.getElementById('info-content').innerHTML = `
        <p>${mission.description}</p>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Filter missions by agency
    const filterCheckboxes = document.querySelectorAll('.mission-filter');
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', filterMissions);
    });
    
    // Reset view button
    document.getElementById('reset-view').addEventListener('click', () => {
        camera.position.set(0, 100, 200);
        controls.target.set(0, 0, 0);
        controls.update();
    });
    
    // Toggle orbits button
    document.getElementById('toggle-orbits').addEventListener('click', () => {
        showOrbits = !showOrbits;
        scene.traverse(object => {
            if (object instanceof THREE.Line && !(object instanceof THREE.Points)) {
                object.visible = showOrbits;
            }
        });
    });
    
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        camera.position.multiplyScalar(0.8);
        controls.update();
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
        camera.position.multiplyScalar(1.2);
        controls.update();
    });
}

// Filter missions by agency
function filterMissions() {
    const activeAgencies = [];
    const filterCheckboxes = document.querySelectorAll('.mission-filter');
    
    // Collect active filters
    filterCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            activeAgencies.push(checkbox.dataset.agency);
        }
    });
    
    // Apply filters to mission list
    const missionItems = document.querySelectorAll('.mission-item');
    missionItems.forEach(item => {
        const missionId = item.dataset.id;
        const mission = missions.find(m => m.id === missionId);
        
        if (mission) {
            const agency = mission.agency;
            // Check if the mission agency is in the active filters
            // For combined agencies like NASA/ESA, check if any part matches
            const shouldShow = activeAgencies.some(activeAgency => {
                if (activeAgency === 'other') {
                    return !agency.includes('NASA') && !agency.includes('ESA');
                }
                return agency.includes(activeAgency);
            });
            
            item.style.display = shouldShow ? 'flex' : 'none';
        }
    });
    
    // Update mission object visibility in the visualization
    missions.forEach(mission => {
        const missionObject = missionObjects[mission.id];
        if (missionObject) {
            const agency = mission.agency;
            const shouldShow = activeAgencies.some(activeAgency => {
                if (activeAgency === 'other') {
                    return !agency.includes('NASA') && !agency.includes('ESA');
                }
                return agency.includes(activeAgency);
            });
            
            missionObject.visible = shouldShow;
        }
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
