// src/lib/physicsEngine.js

/**
 * دالة لحساب فيزياء الشعر (القصور الذاتي والارتداد) بعيداً عن المكون الأساسي
 */
export function calculateHairPhysics(headBone, prevHeadRot, hairBones, hairPhysicsState, isValid) {
  // حساب سرعة حركة الرأس
  const yawVelocity = headBone.rotation.y - prevHeadRot.y;
  const pitchVelocity = headBone.rotation.x - prevHeadRot.x;

  // تحديث القيم السابقة للفريم القادم
  prevHeadRot.y = headBone.rotation.y;
  prevHeadRot.x = headBone.rotation.x;

  // ثوابت الفيزياء
  const stiffness = 0.04; //معامل الصلابة
  const damping = 0.75;  //معامل التخميد
  const inertia = 0.14;  //معامل القصور الذاتي

  hairBones.forEach((bone) => {
    const state = hairPhysicsState[bone.name];
    if (!state || !bone.userData.initRot) return; 

    // حساب القوة المحورية X
    const forceX = -yawVelocity * inertia; 
    state.velocityX += forceX;
    state.velocityX += (0 - state.offsetX) * stiffness; 
    state.velocityX *= damping; 
    state.offsetX += state.velocityX;

    // حساب القوة المحورية Z
    const forceZ = -pitchVelocity * inertia;
    state.velocityZ += forceZ;
    state.velocityZ += (0 - state.offsetZ) * stiffness;
    state.velocityZ *= damping;
    state.offsetZ += state.velocityZ;

    // تطبيق الدوران على العظمة إذا كانت الأرقام صالحة
    if (isValid(state.offsetX) && isValid(state.offsetZ)) {
      bone.rotation.z = bone.userData.initRot.z + state.offsetX;
      bone.rotation.x = bone.userData.initRot.x + state.offsetZ;
    }
  });
}