// File: src/lib/hairPhysicsEngine.js
// Description: Lightweight spring-based hair physics. Given the head bone's
// rotation velocity, it applies inertia/stiffness/damping to each hair bone
// and offsets its rotation. FPS-independent via the delta param.

// Export the hair physics calculation function to be used by ModelViewer
export function calculateHairPhysics(
  // The head bone whose rotation drives the hair physics
  headBone,
  // Object storing the previous frame's head rotation for velocity calculation
  prevHeadRot,
  // Array of hair bone objects to animate
  hairBones,
  // Object mapping bone names to their physics state (offsets and velocities)
  hairPhysicsState,
  // Validation function to check if computed offsets are valid numbers
  isValid,
  // Time elapsed since last frame in seconds (defaults to 1/60 for 60fps)
  delta = 1 / 60,
) {
  // Reference time step for 60fps used to normalize physics calculations
  const REFERENCE_DELTA = 1 / 60;
  // Scale factor that normalizes physics speed regardless of actual frame rate
  const timeScale = delta / REFERENCE_DELTA;

  // Calculate how much the head rotated around Y axis since last frame (yaw velocity)
  const yawVelocity = headBone.rotation.y - prevHeadRot.y;
  // Calculate how much the head rotated around X axis since last frame (pitch velocity)
  const pitchVelocity = headBone.rotation.x - prevHeadRot.x;

  // Store current head Y rotation as previous for next frame
  prevHeadRot.y = headBone.rotation.y;
  // Store current head X rotation as previous for next frame
  prevHeadRot.x = headBone.rotation.x;

  // Spring stiffness constant scaled by time (how strongly hair returns to rest)
  const stiffness = 0.04 * timeScale;
  // Inertia constant scaled by time (how much hair resists sudden movement)
  const inertia = 0.14 * timeScale;
  // Damping factor scaled by time (how quickly hair motion decays)
  const damping = Math.pow(0.75, timeScale);

  // Iterate over each hair bone and apply spring physics
  hairBones.forEach((bone) => {
    // Get the physics state for this specific bone
    const state = hairPhysicsState[bone.name];
    // Skip this bone if no state exists or initial rotation was not recorded
    if (!state || !bone.userData.initRot) return;

    // Calculate inertia force on X axis from yaw velocity
    const forceX = -yawVelocity * inertia;
    // Add the force to the bone's X velocity
    state.velocityX += forceX;
    // Add spring restoring force pulling offset back toward zero
    state.velocityX += (0 - state.offsetX) * stiffness;
    // Apply damping to reduce velocity over time
    state.velocityX *= damping;
    // Integrate velocity into position offset for X axis
    state.offsetX += state.velocityX * timeScale;

    // Calculate inertia force on Z axis from pitch velocity
    const forceZ = -pitchVelocity * inertia;
    // Add the force to the bone's Z velocity
    state.velocityZ += forceZ;
    // Add spring restoring force pulling offset back toward zero
    state.velocityZ += (0 - state.offsetZ) * stiffness;
    // Apply damping to reduce velocity over time
    state.velocityZ *= damping;
    // Integrate velocity into position offset for Z axis
    state.offsetZ += state.velocityZ * timeScale;

    // Only apply the computed offsets if both are valid numbers
    if (isValid(state.offsetX) && isValid(state.offsetZ)) {
      // Apply X axis offset to the bone's Z rotation (hair swings left/right)
      bone.rotation.z = bone.userData.initRot.z + state.offsetX;
      // Apply Z axis offset to the bone's X rotation (hair swings up/down)
      bone.rotation.x = bone.userData.initRot.x + state.offsetZ;
    }
  });
}