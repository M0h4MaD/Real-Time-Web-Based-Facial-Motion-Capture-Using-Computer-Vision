// src/Components/ModelViewer.jsx
import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber"; // 👈 استعادة useThree
import { useGLTF, OrbitControls, Center } from "@react-three/drei";
import * as THREE from "three";

// 📦 Stores & Physics
import { useFaceStore, useUIStore } from "../lib/globalStates";
import { calculateHairPhysics } from "../lib/hairPhysicsEngine";
import { recordCurrentFrame } from "../lib/recorder"; // 👈 استيراد ثابت للأداء

// 🛠️ Helper Functions (خارج المكون لمنع إعادة الإنشاء الإطاري)
const isValidNumber = (n) => typeof n === 'number' && isFinite(n) && !isNaN(n);
const IGNORED_SHAPES = ['yaw', 'pitch', 'roll', 'mouth', 'blink'];

function ModelViewer() {
  const modelUrl = useUIStore((state) => state.modelUrl);
  const setAppError = useUIStore((state) => state.setAppError);
  const setModelBlendshapes = useUIStore((state) => state.setModelBlendshapes); 
  const isMirrored = useUIStore((state) => state.isMirrored); 
  const isGreenScreen = useUIStore((state) => state.isGreenScreen);
  const mocapData = useFaceStore((state) => state.metrics);

  const { scene } = useGLTF(modelUrl);
  const { gl } = useThree(); // 👈 استعادة سياق الـ WebGL

  // المراجع (Refs)
  const headBoneRef = useRef(null);
  const hairBonesRef = useRef([]);
  const morphMeshesRef = useRef([]); 
  const prevHeadRot = useRef({ y: 0, x: 0 });
  const hairPhysicsState = useRef({});

  // التحقق من وجود المجسم
  useEffect(() => {
    if (!scene) {
      setAppError("المجسم غير موجود أو فشل تحميله.");
    }
  }, [scene, setAppError]);

  // 🟢 تفعيل وإلغاء الكروما (المنطق الأصلي الدقيق للشفافية والألوان)
  useEffect(() => {
    if (isGreenScreen) {
      gl.setClearColor('#00FF00', 1); 
    } else {
      gl.setClearColor('#000000', 0); // الحفاظ على خلفية الـ Canvas شفافة بالكامل
    }
  }, [isGreenScreen, gl]);

  // قراءة وتحليل المجسم (Traverse)
  useEffect(() => {
    if (!scene) return;

    let head = null;
    const hairs = [];
    const morphMeshes = []; 
    const allAvailableShapes = new Set();
    
    try {
      scene.traverse((child) => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.frustumCulled = false;
        }

        if (child.isBone) {
          const name = child.name.toLowerCase();
          if (name.includes("head") && !name.includes("nub")) {
            head = child;
          }
          if (child.name.startsWith("J_Sec_Hair")) {
            hairs.push(child);
            if (!child.userData.initRot) {
              child.userData.initRot = child.rotation.clone();
            }
            if (!hairPhysicsState.current[child.name]) {
              hairPhysicsState.current[child.name] = { offsetX: 0, velocityX: 0, offsetZ: 0, velocityZ: 0 };
            }
          }
        }
        
        if (child.isSkinnedMesh && child.morphTargetDictionary) {
          morphMeshes.push(child);
          Object.keys(child.morphTargetDictionary).forEach(shape => allAvailableShapes.add(shape));
        }
      });

      setModelBlendshapes(Array.from(allAvailableShapes).sort());

      headBoneRef.current = head;
      hairBonesRef.current = hairs;
      morphMeshesRef.current = morphMeshes; 

    } catch (error) {
      setAppError("حدث خطأ أثناء قراءة المجسم وتجهيز العظام.");
    }
  }, [scene, setAppError, setModelBlendshapes]);

  // محرك التحديث والإطارات (Render Loop)
  useFrame(() => {
    if (!mocapData || !scene) return;

    if (typeof recordCurrentFrame === 'function') {
      recordCurrentFrame(mocapData);
    }

    const headBone = headBoneRef.current;

    // 1. تحريك الرأس وتطبيق فيزياء الشعر
    if (headBone) {
      const targetYaw = isMirrored ? -mocapData.yaw : mocapData.yaw;
      const targetRoll = isMirrored ? -mocapData.roll : mocapData.roll; 

      if (isValidNumber(mocapData.yaw)) headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, targetYaw, 0.15); 
      if (isValidNumber(mocapData.pitch)) headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, mocapData.pitch, 0.15);
      if (isValidNumber(mocapData.roll)) headBone.rotation.z = THREE.MathUtils.lerp(headBone.rotation.z, targetRoll, 0.15);

      if (hairBonesRef.current.length > 0) {
        calculateHairPhysics(
          headBone, 
          prevHeadRot.current, 
          hairBonesRef.current, 
          hairPhysicsState.current, 
          isValidNumber
        );
      }
    }

    // 2. تحريك تعابير الوجه (Morph Targets)
    morphMeshesRef.current.forEach((child) => {
      Object.entries(mocapData).forEach(([shapeName, targetValue]) => {
        if (IGNORED_SHAPES.includes(shapeName)) return; 
        
        const index = child.morphTargetDictionary[shapeName];
        if (index !== undefined && isValidNumber(targetValue) && index < child.morphTargetInfluences.length) {
          
          const isMouthShape = shapeName.toLowerCase().includes('mouth') || shapeName.toLowerCase().includes('jaw');
          const finalValue = isMouthShape ? Math.min(targetValue * 1.5, 1) : targetValue;
          const lerpSpeed = isMouthShape ? 0.45 : 0.2;

          child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
            child.morphTargetInfluences[index],
            finalValue,
            lerpSpeed 
          );
        }
      });
    });
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[0, 5, 5]} intensity={1} />
      
      {scene && (
        <Center>
          <primitive object={scene} />
        </Center>
      )}
      
      <OrbitControls enablePan={false} enableDamping={true} minDistance={0.5} maxDistance={4} />
    </>
  );
}

useGLTF.preload("/Adam.glb");
export default React.memo(ModelViewer);