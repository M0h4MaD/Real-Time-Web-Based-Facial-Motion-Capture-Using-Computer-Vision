// src/Components/ModelViewer.jsx
import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Center } from "@react-three/drei";
import { useFaceStore, useUIStore } from "../lib/globalStates";
import * as THREE from "three";

function ModelViewer() {
  const modelUrl = useUIStore((state) => state.modelUrl);
  const { scene } = useGLTF(modelUrl);
  
  const mocapData = useFaceStore((state) => state.metrics);
  const isMirrored = useUIStore((state) => state.isMirrored); 
  const isGreenScreen = useUIStore((state) => state.isGreenScreen);
  const { gl } = useThree(); 

  // المراجع الخاصة بالرأس وخصلات الشعر
  const headBoneRef = useRef(null);
  const hairBonesRef = useRef([]);
  
  // حفظ قيم الفيزياء وحركة الرأس السابقة لحساب السرعة
  const prevHeadRot = useRef({ y: 0, x: 0 });
  const hairPhysicsState = useRef({}); // سيعمل كـ Map لحفظ (الحركة + السرعة) لكل خصلة

  useEffect(() => {
    if (isGreenScreen) gl.setClearColor('#00FF00', 1); 
    else gl.setClearColor('#000000', 0); 
  }, [isGreenScreen, gl]);

  // فحص المجسم وجمع العظام وتخزين حالتها الابتدائية
  useEffect(() => {
    let head = null;
    const hairs = [];
    
    scene.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) child.frustumCulled = false;

      if (child.isBone) {
        const name = child.name;
        
        // 1. تحديد عظمة الرأس
        if (name.toLowerCase().includes("head") && !name.toLowerCase().includes("nub")) {
          head = child;
        }
        
        // 2. التقاط جميع خصلات الشعر الخارجية بناءً على نظام التسمية J_Sec_Hair
        if (name.startsWith("J_Sec_Hair")) {
          hairs.push(child);
          
          // حفظ الدوران الافتراضي للخصلة في الـ Blender Rest Pose
          if (!child.userData.initRot) {
            child.userData.initRot = child.rotation.clone();
          }
          
          // إنشاء حالة فيزيائية مستقلة لكل خصلة إذا لم تكن موجودة
          if (!hairPhysicsState.current[name]) {
            hairPhysicsState.current[name] = {
              offsetX: 0, velocityX: 0, // الحركة الجانبية (يمين/يسار)
              offsetZ: 0, velocityZ: 0  // الحركة الأمامية والخلفية
            };
          }
        }
      }
    });

    headBoneRef.current = head;
    hairBonesRef.current = hairs;
  }, [scene]);

  useFrame(() => {
    if (!mocapData) return;

    import("../lib/recorder").then(module => module.recordCurrentFrame(mocapData));

    const isValid = (n) => typeof n === 'number' && isFinite(n) && !isNaN(n);
    const headBone = headBoneRef.current;

    // --- 1. تطبيق دوران الرأس الأساسي ---
    if (headBone) {
      const targetYaw = isMirrored ? -mocapData.yaw : mocapData.yaw;
      const targetRoll = isMirrored ? -mocapData.roll : mocapData.roll; 

      if (isValid(mocapData.yaw)) headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, targetYaw, 0.15); 
      if (isValid(mocapData.pitch)) headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, mocapData.pitch, 0.15);
      if (isValid(mocapData.roll)) headBone.rotation.z = THREE.MathUtils.lerp(headBone.rotation.z, targetRoll, 0.15);

      // --- 2. محاكاة فيزياء الشعر (Inertia + Spring Damping) ---
      if (hairBonesRef.current.length > 0) {
        // حساب سرعة دوران الرأس الفجائية (الفرق بين الفريم الحالي والسابق)
        const yawVelocity = headBone.rotation.y - prevHeadRot.current.y;
        const pitchVelocity = headBone.rotation.x - prevHeadRot.current.x;

        // تحديث قيم الفريم السابق
        prevHeadRot.current.y = headBone.rotation.y;
        prevHeadRot.current.x = headBone.rotation.x;

        // إعدادات التحكم بالفيزياء (تم ضبها لتكون خفيفة جداً ولطيفة بناءً على طلبك)
        const stiffness = 0.04; // قوة النابض لإعادة الشعر لمكانه (كلما قلّ زاد الارتخاء)
        const damping = 0.75;   // المقاومة لتهدئة الاهتزاز ومنع الحركات اللانهائية
        const inertia = 0.14;   // قوة اندفاع وتطاير الشعر (قيمة منخفضة جداً لحركة ناعمة وخفيفة)

        hairBonesRef.current.forEach((bone) => {
          const state = hairPhysicsState.current[bone.name];
          if (!state) return;

          // أ) حركة التأرجح الجانبي (تتأثر بالتفات الرأس يميناً ويساراً)
          const forceX = -yawVelocity * inertia; // عكس اتجاه الرأس لقانون القصور
          state.velocityX += forceX;
          state.velocityX += (0 - state.offsetX) * stiffness; // سحب مرن نحو المركز (0)
          state.velocityX *= damping; // تطبيق التهدئة الفيزيائية
          state.offsetX += state.velocityX;

          // ب) حركة التأرجح الأمامي والخلفي (عند الإيماء بالرأس فوق وتحت)
          const forceZ = -pitchVelocity * inertia;
          state.velocityZ += forceZ;
          state.velocityZ += (0 - state.offsetZ) * stiffness;
          state.velocityZ *= damping;
          state.offsetZ += state.velocityZ;

          // جـ) تطبيق الإزاحة الفيزيائية مضافةً فوق دوران الخصلة الأصلي بأمان
          bone.rotation.z = bone.userData.initRot.z + state.offsetX;
          bone.rotation.x = bone.userData.initRot.x + state.offsetZ;
        });
      }
    }

    // --- 3. تطبيق مفاتيح الـ Blendshapes الصافية وتحسين الـ Lipsync ---
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        Object.entries(mocapData).forEach(([shapeName, targetValue]) => {
          if (['yaw', 'pitch', 'roll', 'mouth', 'blink'].includes(shapeName)) return; 
          
          const index = child.morphTargetDictionary[shapeName];
          if (index !== undefined && isValid(targetValue)) {
            let finalValue = targetValue;
            
            // تحسين تزامن حركة الشفاه والفم وتضخيمها
            const isMouthShape = shapeName.toLowerCase().includes('mouth') || shapeName.toLowerCase().includes('jaw');
            if (isMouthShape) {
              finalValue = Math.min(finalValue * 1.5, 1);
            }

            const lerpSpeed = isMouthShape ? 0.45 : 0.2;

            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              finalValue,
              lerpSpeed 
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

useGLTF.preload("/Adam.glb");

export default React.memo(ModelViewer);