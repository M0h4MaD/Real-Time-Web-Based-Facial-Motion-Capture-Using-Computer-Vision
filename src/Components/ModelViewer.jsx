// src/Components/ModelViewer.jsx
import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Center } from "@react-three/drei";
import { useFaceStore, useUIStore } from "../lib/globalStates";
import * as THREE from "three";

function ModelViewer() {
  const { scene } = useGLTF("/Adam.glb");
  const mocapData = useFaceStore((state) => state.metrics);
  
  // 1. جلب حالات الواجهة
  const isMirrored = useUIStore((state) => state.isMirrored); 
  const isGreenScreen = useUIStore((state) => state.isGreenScreen);

  // 2. سحب كائن الرندر للتحكم ببيئة المشهد
  const { gl } = useThree(); 

  const bonesRef = useRef({ headBone: null });

  // 3. تأثير الشاشة الخضراء (Chroma Key) عبر الرندر مباشرة
  useEffect(() => {
    if (isGreenScreen) {
      // تلوين خلفية المحرك بالأخضر الصافي 100% وبشفافية معدومة (1)
      gl.setClearColor('#00FF00', 1); 
    } else {
      // إعادة الخلفية لتكون شفافة تماماً (0) ليظهر لون واجهة التطبيق
      gl.setClearColor('#000000', 0); 
    }
  }, [isGreenScreen, gl]);

  // 4. إعداد المجسم والبحث عن عظمة الرأس
  useEffect(() => {
    let head = null;
    
    scene.traverse((child) => {
      // منع اختفاء المجسم عند خروجه من أطراف الكاميرا
      if (child.isMesh || child.isSkinnedMesh) child.frustumCulled = false;

      if (child.isBone) {
        const name = child.name.toLowerCase();
        if (name.includes("head") && !name.includes("nub")) head = child;
      }
    });

    bonesRef.current = { headBone: head };
  }, [scene]);

  // 5. حلقة التحديث (Frame Loop) لتطبيق الحركة
  useFrame(() => {
    if (!mocapData) return;

    const isValid = (n) => typeof n === 'number' && isFinite(n) && !isNaN(n);
    const { headBone } = bonesRef.current;

    // --- تطبيق دوران الرأس الفراغي ---
    if (headBone) {
      // تطبيق منطق المرآة بعكس الإشارة
      const targetYaw = isMirrored ? -mocapData.yaw : mocapData.yaw;
      const targetRoll = isMirrored ? -mocapData.roll : mocapData.roll; 

      if (isValid(mocapData.yaw)) headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, targetYaw, 0.15); 
      if (isValid(mocapData.pitch)) headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, mocapData.pitch, 0.15);
      if (isValid(mocapData.roll)) headBone.rotation.z = THREE.MathUtils.lerp(headBone.rotation.z, targetRoll, 0.15);
    }

    // --- تطبيق مفاتيح الـ Blendshapes الصافية ---
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        Object.entries(mocapData).forEach(([shapeName, targetValue]) => {
          // استثناء القيم التي لا تعبر عن Morph Targets
          if (['yaw', 'pitch', 'roll', 'mouth', 'blink'].includes(shapeName)) return; 
          
          const index = child.morphTargetDictionary[shapeName];
          if (index !== undefined && isValid(targetValue)) {
            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              targetValue,
              0.25 // سرعة استجابة ملامح الوجه
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