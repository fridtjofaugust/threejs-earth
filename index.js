import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

// Import the GLTFLoader
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";

import { CSS2DRenderer, CSS2DObject } from "jsm/renderers/CSS2DRenderer.js";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

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

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects([iss], true);

  if (intersects.length > 0) {
    // Store the original camera position and orientation
    if (!window.originalCameraState) {
      window.originalCameraState = {
        position: camera.position.clone(),
        target: controls.target.clone(),
      };
    }

    // Move the camera to the ISS and set it to look at it
    const newTarget = intersects[0].object.position;
    controls.target.set(newTarget.x, newTarget.y, newTarget.z);
    camera.position.set(
      newTarget.x + 1.5,
      newTarget.y + 1.5,
      newTarget.z + 1.5
    ); // Adjust as needed

    // Show the reset button
    document.getElementById("resetCameraBtn").style.display = "block";
  }
}
window.addEventListener("click", onMouseClick);

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
  controls.update();

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

  function updateHUD() {
    const issSpeedKPH = 28000; // Example speed for the ISS

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
