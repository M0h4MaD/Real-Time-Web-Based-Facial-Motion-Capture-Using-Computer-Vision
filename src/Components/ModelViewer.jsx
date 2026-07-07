import React, { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Center } from "@react-three/drei";
import { useFaceStore } from "../lib/globalStates";
import * as THREE from "three";

function ModelViewer() {
  const { scene } = useGLTF("/Adam.glb");
  const mocapData = useFaceStore((state) => state.metrics);

  // منع اختفاء المودل
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) child.frustumCulled = false;
    });
  }, [scene]);

  // البحث عن عظام العيون والرأس مرة واحدة فقط
  const { headBone, eyeLBone, eyeRBone } = useMemo(() => {
    let head = null, eyeL = null, eyeR = null;
    scene.traverse((child) => {
      if (child.isBone) {
        const name = child.name.toLowerCase();
        if (name.includes("head") && !name.includes("nub")) head = child;
        if ((name.includes("eye") && name.includes("l")) || name === "J_Adj_L_FaceEye") eyeL = child;
        if ((name.includes("eye") && name.includes("r")) || name === "J_Adj_R_FaceEye") eyeR = child;
      }
    });
    return { headBone: head, eyeLBone: eyeL, eyeRBone: eyeR };
  }, [scene]);

  useFrame(() => {
    if (!mocapData) return;

    // دالة للتحقق من أن القيمة صالحة وليست NaN
    const isValid = (n) => typeof n === 'number' && isFinite(n) && !isNaN(n);

    // 1. تطبيق دوران الرأس الفراغي الحقيقي (مع حماية)
    if (headBone) {
      if (isValid(mocapData.yaw)) headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, -mocapData.yaw, 0.15);
      if (isValid(mocapData.pitch)) headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, mocapData.pitch, 0.15);
      if (isValid(mocapData.roll)) headBone.rotation.z = THREE.MathUtils.lerp(headBone.rotation.z, -mocapData.roll, 0.15);
    }

    // 2. تطبيق تتبع البؤبؤ (Iris) مع حماية
    if (mocapData.gaze) {
      if (eyeLBone && isValid(mocapData.gaze.l?.x) && isValid(mocapData.gaze.l?.y)) {
        eyeLBone.rotation.y = THREE.MathUtils.lerp(eyeLBone.rotation.y, mocapData.gaze.l.x * 1.5, 0.2);
        eyeLBone.rotation.x = THREE.MathUtils.lerp(eyeLBone.rotation.x, mocapData.gaze.l.y, 0.2);
      }
      if (eyeRBone && isValid(mocapData.gaze.r?.x) && isValid(mocapData.gaze.r?.y)) {
        eyeRBone.rotation.y = THREE.MathUtils.lerp(eyeRBone.rotation.y, mocapData.gaze.r.x * 1.5, 0.2);
        eyeRBone.rotation.x = THREE.MathUtils.lerp(eyeRBone.rotation.x, mocapData.gaze.r.y, 0.2);
      }
    }

    // 3. تطبيق مفاتيح الـ Blendshapes الصافية (مع حماية)
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        Object.entries(mocapData).forEach(([shapeName, targetValue]) => {
          if (['gaze', 'yaw', 'pitch', 'roll', 'mouth', 'blink'].includes(shapeName)) return; 
          
          const index = child.morphTargetDictionary[shapeName];
          if (index !== undefined && isValid(targetValue)) {
            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              targetValue,
              0.18
            );
          }
        });
      }
    });
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[0, 5, 5]} intensity={1} />
      <Center>
        <primitive object={scene} />
      </Center>
      <OrbitControls enablePan={false} enableDamping={true} minDistance={0.5} maxDistance={4} />
    </>
  );
}

export default React.memo(ModelViewer);