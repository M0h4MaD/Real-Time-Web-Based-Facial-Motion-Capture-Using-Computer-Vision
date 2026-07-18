// src/lib/physicsEngine.js
// (نفس الملف يلي بعتلك ياه قبل شوي — لسا معتمد، جزء أساسي من هالدفعة)

export function calculateHairPhysics(
  headBone,
  prevHeadRot,
  hairBones,
  hairPhysicsState,
  isValid,
  delta = 1 / 60,
) {
  const REFERENCE_DELTA = 1 / 60;
  const timeScale = delta / REFERENCE_DELTA;

  const yawVelocity = headBone.rotation.y - prevHeadRot.y;
  const pitchVelocity = headBone.rotation.x - prevHeadRot.x;

  prevHeadRot.y = headBone.rotation.y;
  prevHeadRot.x = headBone.rotation.x;

  const stiffness = 0.04 * timeScale;
  const inertia = 0.14 * timeScale;
  const damping = Math.pow(0.75, timeScale);

  hairBones.forEach((bone) => {
    const state = hairPhysicsState[bone.name];
    if (!state || !bone.userData.initRot) return;

    const forceX = -yawVelocity * inertia;
    state.velocityX += forceX;
    state.velocityX += (0 - state.offsetX) * stiffness;
    state.velocityX *= damping;
    state.offsetX += state.velocityX * timeScale;

    const forceZ = -pitchVelocity * inertia;
    state.velocityZ += forceZ;
    state.velocityZ += (0 - state.offsetZ) * stiffness;
    state.velocityZ *= damping;
    state.offsetZ += state.velocityZ * timeScale;

    if (isValid(state.offsetX) && isValid(state.offsetZ)) {
      bone.rotation.z = bone.userData.initRot.z + state.offsetX;
      bone.rotation.x = bone.userData.initRot.x + state.offsetZ;
    }
  });
}
