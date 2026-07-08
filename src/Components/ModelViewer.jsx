// ModelViewer.jsx
import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Center } from "@react-three/drei";
import { useFaceStore } from "../lib/globalStates";
import * as THREE from "three";

function ModelViewer() {
  const { scene } = useGLTF("/Adam.glb");
  const mocapData = useFaceStore((state) => state.metrics);

  const bonesRef = useRef({ headBone: null });

  useEffect(() => {
    let head = null;
    
    scene.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) child.frustumCulled = false;

      if (child.isBone) {
        const name = child.name.toLowerCase();
        if (name.includes("head") && !name.includes("nub")) head = child;
      }
    });

    bonesRef.current = { headBone: head };
  }, [scene]);

  useFrame(() => {
    if (!mocapData) return;

    const isValid = (n) => typeof n === 'number' && isFinite(n) && !isNaN(n);
    const { headBone } = bonesRef.current;

    // 1. تطبيق دوران الرأس الفراغي
    if (headBone) {
      if (isValid(mocapData.yaw)) headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, -mocapData.yaw, 0.15);
      if (isValid(mocapData.pitch)) headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, mocapData.pitch, 0.15);
      if (isValid(mocapData.roll)) headBone.rotation.z = THREE.MathUtils.lerp(headBone.rotation.z, -mocapData.roll, 0.15);
    }

    // 2. تطبيق مفاتيح الـ Blendshapes الصافية
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        Object.entries(mocapData).forEach(([shapeName, targetValue]) => {
          if (['yaw', 'pitch', 'roll', 'mouth', 'blink'].includes(shapeName)) return; 
          
          const index = child.morphTargetDictionary[shapeName];
          if (index !== undefined && isValid(targetValue)) {
            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              targetValue,
              0.25 // رفعنا سرعة الاستجابة للفم ليكون متزامن أكتر
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
      <Center >
        <primitive object={scene} />
      </Center>
      <OrbitControls enablePan={false} enableDamping={true} minDistance={0.5} maxDistance={4} />
    </>
  );
}

export default React.memo(ModelViewer);