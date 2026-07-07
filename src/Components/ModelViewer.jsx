import React, { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Center } from "@react-three/drei";
import { useFaceStore } from "../lib/globalStates"; // تأكد من تحديث الـ Store لـ يخزن مخرجات processFaceMocap
import * as THREE from "three";

function ModelViewer() {
  const { scene } = useGLTF("/Adam.glb");
  const mocapData = useFaceStore((state) => state.metrics); // الـ metrics الآن هي مخرجات الدالة الجديدة

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) child.frustumCulled = false;
    });
  }, [scene]);

 useFrame(() => {
    if (!mocapData) return;

    const head = scene.getObjectByName("J_Bip_C_Head");
    if (head) {
      const targetYaw = (mocapData.yaw - 0.5) * 1.8; 
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetYaw, 0.25);
    }

    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        Object.entries(mocapData).forEach(([shapeName, targetValue]) => {
          const index = child.morphTargetDictionary[shapeName];
          if (index !== undefined) {
            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              targetValue,
              0.35 
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