import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

// Import the GLTFLoader
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";

import { CSS2DRenderer, CSS2DObject } from "jsm/renderers/CSS2DRenderer.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 3;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0px";
labelRenderer.domElement.style.pointerEvents = "none";
document.body.appendChild(labelRenderer.domElement);

const earthGroup = new THREE.Group();
earthGroup.rotation.z = (-23.4 * Math.PI) / 180;
scene.add(earthGroup);

let airplane; // This will hold your .glb model

let haloMesh; // This will hold the halo mesh

// Create a blinking red marker
const markerGeometry = new THREE.SphereGeometry(0.05, 32, 32); // Small sphere as a marker
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color
const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
markerMesh.position.set(0, 0.2, 0); // Position it closer to the Earth's surface
earthGroup.add(markerMesh);

const controls = new OrbitControls(camera, renderer.domElement);
const detail = 12;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/00_earthmap1k.jpg"),
  specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.04,
});
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
  map: loader.load("./textures/03_earthlights1k.jpg"),
  blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
  map: loader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: loader.load("./textures/05_earthcloudmaptrans.jpg"),
  // alphaTest: 0.3,
});
const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const stars = getStarfield({ numStars: 2000 });
scene.add(stars);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increase intensity to 1.5
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

let lastBlinkTime = 0;
const blinkInterval = 1000; // Blink every 1000 milliseconds (1 second)

// Constants for orbit
const orbitRadius = 1.005; // This should be slightly more than the radius of your Earth mesh
const orbitPeriod = 10; // Orbital period in seconds (2 hours) org: 7200 (1200 kph).

// ISS
let iss; // This will hold your ISS model
const issOrbitRadius = 4.0; // Larger orbit radius than the X-15 plane
const issOrbitPeriod = 90; // Represents the ISS's orbit period in minutes, scaled down for visual effectiveness

// Load the ISS model and add it to the scene
function loadISSModel() {
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    "glb/iss.glb", // Path to your ISS .glb file
    (gltf) => {
      iss = gltf.scene;

      iss.scale.set(0.05, 0.05, 0.05); // Adjust scale values as needed
      iss.position.set(issOrbitRadius, 0, 0); // Start position at orbit radius

      // Add the ISS to the earthGroup so it moves with the Earth
      earthGroup.add(iss);

      // You can add a halo effect to the ISS here if you want, similar to the airplane
    },
    undefined,
    (error) => {
      console.error(error);
    }
  );
}

// Call the function to load the ISS model
loadISSModel();

// In your animate function, update the ISS position to orbit around the Earth
function updateISSOrbit() {
  if (iss) {
    const currentTime = Date.now();
    const issElapsedTime = (currentTime / 1000) % issOrbitPeriod;
    const issAngle = (issElapsedTime / issOrbitPeriod) * Math.PI * 2;

    iss.position.x = issOrbitRadius * Math.cos(issAngle);
    iss.position.z = issOrbitRadius * Math.sin(issAngle);
    iss.position.y = 0.5 * Math.sin(issAngle); // Adjust Y position
  }
}

// Inside your animate function, add this call
updateISSOrbit();

function animate() {
  requestAnimationFrame(animate);

  // Update controls
  controls.update(); // onl

  // Update the blinking marker
  const currentTime = Date.now();
  if (currentTime - lastBlinkTime > blinkInterval) {
    markerMesh.visible = !markerMesh.visible; // Toggle visibility
    lastBlinkTime = currentTime;
  }

  // Update the marker position to orbit around the Earth
  const elapsedTime = (currentTime / 1000) % orbitPeriod; // Time in seconds
  const angle = (elapsedTime / orbitPeriod) * Math.PI * 2; // Full rotation in radians

  // Assuming a circular orbit in the XZ plane
  markerMesh.position.x = orbitRadius * Math.cos(angle);
  markerMesh.position.z = orbitRadius * Math.sin(angle);

  // earthMesh.rotation.y += 0.002;
  // lightsMesh.rotation.y += 0.002;
  glowMesh.rotation.y += 0.002;
  cloudsMesh.rotation.y += 0.0023;
  stars.rotation.y -= 0.0002;

  // Update the airplane position to orbit around the Earth with a different speed
  if (airplane) {
    const planeCurrentTime = Date.now();
    const planeElapsedTime = (planeCurrentTime / 1000) % orbitPeriod;
    const planeAngle = (planeElapsedTime / orbitPeriod) * Math.PI * 2;
    airplane.position.y = orbitRadius * Math.sin(planeAngle); // Vertical movement
    airplane.position.z = orbitRadius * Math.cos(planeAngle); // Circular path

    // Rotate the airplane to face along the direction of motion
    // This aligns the airplane's forward direction with the tangent of the orbit path
    airplane.rotation.x = Math.PI / 2 - planeAngle;

    // Optionally, you could rotate the haloMesh the same way if it's not aligned with the airplane
    if (haloMesh) {
      haloMesh.rotation.y = airplane.rotation.y;
    }
  }

  function updateHUD() {
    const airplaneSpeedKPH = 7273; // Example speed for the X-15
    const issSpeedKPH = 28000; // Example speed for the ISS

    document.getElementById(
      "airplaneInfo"
    ).textContent = `Airplane: ${airplaneSpeedKPH} kph`;
    document.getElementById("issInfo").textContent = `ISS: ${issSpeedKPH} kph`;
  }

  // Call this function within your animate() function
  updateHUD();

  updateISSOrbit(); // Update the ISS orbit
  renderer.render(scene, camera);
  // labelRenderer.render(scene, camera);
}

animate();

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", handleWindowResize, false);

// Load the .glb model and add it to the scene
function loadAirplaneModel() {
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    "glb/north_american_x-15_plane.glb",
    (gltf) => {
      airplane = gltf.scene;

      airplane.scale.set(0.03, 0.03, 0.03); // Adjust scale values as needed
      airplane.position.set(0, 1.1, 0); // Adjust to place on the Earth's surface

      // Rotate the airplane to face the correct direction
      // Assuming the plane needs to be rotated on the Y axis to face forward
      airplane.rotation.y = Math.PI; // Adjust as necessary to align with the orbit direction
      // Add the airplane to the earthGroup so it moves with the Earth
      earthGroup.add(airplane);

      const airplaneLabelDiv = document.createElement("div");
      airplaneLabelDiv.className = "label";
      airplaneLabelDiv.textContent = "X-15";
      airplaneLabelDiv.style.marginTop = "-1em";
      const airplaneLabel = new CSS2DObject(airplaneLabelDiv);
      airplaneLabel.position.set(0, 0.5, 0);
      airplane.add(airplaneLabel); // Assuming 'airplane' is your airplane mesh

      // Create a glow effect (halo) around the airplane for visibility
      const haloGeometry = new THREE.TorusGeometry(0.08, 0.02, 16, 100);
      // Improved halo effect
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, // Use white for better visibility
        side: THREE.DoubleSide, // Render both sides of the halo
        blending: THREE.AdditiveBlending, // Use additive blending for a glow effect
      });
      haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
      haloMesh.rotation.x = Math.PI / 2;
      airplane.add(haloMesh);
    },
    undefined,
    (error) => {
      console.error(error);
    }
  );
}

loadAirplaneModel(); // Call the function to load the model
