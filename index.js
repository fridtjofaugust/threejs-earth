import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";
import { CSS2DRenderer, CSS2DObject } from "jsm/renderers/CSS2DRenderer.js";

let issClicked = false; // Add this line near the top of your script
let originalCameraPosition = new THREE.Vector3();
let originalControlsTarget = new THREE.Vector3();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function focusOnISS(intersect) {
  // Save original camera state
  originalCameraPosition.copy(camera.position);
  originalControlsTarget.copy(controls.target);

  const issPosition = intersect.object.position;
  const earthPosition = new THREE.Vector3(0, 0, 0); // Assuming Earth is at the origin
  const direction = new THREE.Vector3()
    .subVectors(issPosition, earthPosition)
    .normalize();
  const distance = 2; // Distance from ISS; adjust for desired zoom level

  const newCameraPosition = issPosition
    .clone()
    .add(direction.multiplyScalar(distance));
  camera.position.copy(newCameraPosition);
  camera.lookAt(issPosition);
  controls.target.copy(issPosition);
  controls.update();

  document.getElementById("resetCameraBtn").style.display = "block";
  issClicked = true;
}

function resetCamera() {
  camera.position.copy(originalCameraPosition);
  controls.target.copy(originalControlsTarget);
  controls.update();
  document.getElementById("resetCameraBtn").style.display = "none";
  issClicked = false;
}


// Event listeners
window.addEventListener("click", function (event) {
  event.preventDefault();

  mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  for (let i = 0; i < intersects.length; i++) {
    if (intersects[i].object.name === "ISS") {
      focusOnISS(intersects[i]);
      break;
    }
  }
});

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
    const intersection = intersects[0]; // Safely get the first item
    if (intersection && intersection.object) {
      const newTarget = intersection.object.position;
      // Set the camera to look at the ISS
      camera.lookAt(newTarget.x, newTarget.y, newTarget.z);

      // Reduce the offset to zoom in closer
      const zoomOffset = 0.5; // Closer than 1.5 units
      camera.position.set(
        newTarget.x + zoomOffset,
        newTarget.y + zoomOffset,
        newTarget.z + zoomOffset
      );

      document.getElementById("resetCameraBtn").style.display = "block";
      issClicked = true;
    }

    const newTarget = intersects[0].object.position;
    camera.lookAt(newTarget.x, newTarget.y, newTarget.z);
    camera.position.set(
      newTarget.x + 1.5,
      newTarget.y + 1.5,
      newTarget.z + 1.5
    );

    document.getElementById("resetCameraBtn").style.display = "block";

    // Action if the ISS is clicked
    for (let i = 0; i < intersects.length; i++) {
      if (intersects[i].object === iss) {
        // Perform the desired action, like displaying information or changing the view
        console.log("ISS clicked");
        break;
      }
    }
  }
}

window.addEventListener("click", onMouseClick, false);

function onDocumentMouseDown(event) {
  event.preventDefault();

  mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const res = intersects.filter(function (res) {
      return res && res.object;
    })[0];

    if (res && res.object.name === "ISS") {
      // Set the camera position and look at the ISS model
      const offset = new THREE.Vector3(0, 0.05, 0.2); // You may need to adjust this offset
      camera.position.copy(res.object.position.clone().add(offset));
      camera.lookAt(res.object.position);
    }
  }
}

window.addEventListener("mousedown", onDocumentMouseDown, false);

// Add this code at the end of your script to create the reset button
var resetBtn = document.createElement("button");
resetBtn.innerHTML = "Reset Camera";
resetBtn.id = "resetCameraBtn";
resetBtn.style.position = "absolute";
resetBtn.style.left = "20px";
resetBtn.style.bottom = "20px";
resetBtn.style.display = "none";
document.body.appendChild(resetBtn);

document
  .getElementById("resetCameraBtn")
  .addEventListener("click", function () {
    if (window.originalCameraState) {
      camera.position.copy(window.originalCameraState.position);
      controls.target.copy(window.originalCameraState.target);
      controls.enabled = true; // Re-enable orbit controls
      controls.update();
    }
    this.style.display = "none"; // Hide the reset button
    issClicked = false; // Add this line
  });

// Load the ISS model and add it to the scene
function loadISSModel() {
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    "glb/iss.glb", // Path to your ISS .glb file
    (gltf) => {
      iss = gltf.scene;
      iss.name = "ISS";

      iss.scale.set(0.05, 0.05, 0.05); // Adjust scale values as needed
      iss.position.set(issOrbitRadius, 0, 0); // Start position at orbit radius

      // Add the ISS to the earthGroup so it moves with the Earth
      earthGroup.add(iss);

      // Inside the loadISSModel function, after the ISS has been loaded and set up
      const issLabelDiv = document.createElement("div");
      issLabelDiv.className = "label";
      issLabelDiv.textContent = "ISS"; // Or any other text you want
      const issLabel = new CSS2DObject(issLabelDiv);
      issLabel.position.set(0, 0.5, 0); // Adjust for visibility, relative to ISS
      iss.add(issLabel); // Attach the label to the ISS model

      // You can add a halo effect to the ISS here if you want, similar to the airplane
    },
    undefined,
    (error) => {
      console.error(error);
    }
  );
}

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

let cameraTargetPosition = new THREE.Vector3();
let cameraTargetQuaternion = new THREE.Quaternion();
const lerpFactor = 0.1; // Adjust this value for smoother or quicker transitions.

function updateCameraPosition() {
  if (issClicked && iss) {
    const issPosition = iss.position;
    const earthPosition = new THREE.Vector3(0, 0, 0); // Assuming Earth is at the origin
    const direction = new THREE.Vector3()
      .subVectors(issPosition, earthPosition)
      .normalize();
    const distance = 2; // Distance from ISS; adjust for desired zoom level

    const newCameraPosition = issPosition
      .clone()
      .add(direction.multiplyScalar(distance));
    camera.position.lerp(newCameraPosition, 0.1);
    camera.lookAt(issPosition);
    controls.target.copy(issPosition); // Ensure controls target is updated
    controls.update();
  }
}

// Add this line near the top of your script
let animateObjects = true; // Controls the animation of the ISS and the red marker

// Function to toggle the animation
function toggleAnimation() {
  animateObjects = !animateObjects; // Toggle the state
  document.getElementById("toggleAnimationBtn").textContent = animateObjects
    ? "Stop"
    : "Start";
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  if (animateObjects) {
    const currentTime = Date.now();
    if (currentTime - lastBlinkTime > blinkInterval) {
      markerMesh.visible = !markerMesh.visible; // Toggle visibility
      lastBlinkTime = currentTime;
    }

    const elapsedTime = (currentTime / 1000) % orbitPeriod;
    const angle = (elapsedTime / orbitPeriod) * Math.PI * 2;
    markerMesh.position.x = orbitRadius * Math.cos(angle);
    markerMesh.position.z = orbitRadius * Math.sin(angle);

    // earthMesh.rotation.y += 0.002;
    // lightsMesh.rotation.y += 0.002;
    glowMesh.rotation.y += 0.002;
    cloudsMesh.rotation.y += 0.0023;
    stars.rotation.y -= 0.0002;

    function updateHUD() {
      const issSpeedKPH = 28000; // Example speed for the ISS

      document.getElementById(
        "issInfo"
      ).textContent = `ISS: ${issSpeedKPH} kph`;
    }

    // Call this function within your animate() function
    updateHUD();

    updateISSOrbit(); // Update the ISS orbit

    if (issClicked) {
      updateCameraPosition();
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
}

animate();

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", handleWindowResize, false);

// In the part of your script where you set up event listeners:
document
  .getElementById("toggleAnimationBtn")
  .addEventListener("click", toggleAnimation);
