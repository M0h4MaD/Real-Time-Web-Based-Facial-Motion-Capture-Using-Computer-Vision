// src/Components/ModelViewer.jsx
import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Center } from "@react-three/drei";
import * as THREE from "three";

import { useFaceStore, useUIStore } from "../lib/globalStates";
import { calculateHairPhysics } from "../lib/hairPhysicsEngine";
import { recordCurrentFrame } from "../lib/recorder";

const isValidNumber = (n) => typeof n === "number" && isFinite(n) && !isNaN(n);
const IGNORED_SHAPES = ["yaw", "pitch", "roll", "mouth", "blink"];

function ModelViewer() {
  const modelUrl = useUIStore((state) => state.modelUrl);
  const setAppError = useUIStore((state) => state.setAppError);
  const setAppSuccess = useUIStore((state) => state.setAppSuccess);
  const setModelBlendshapes = useUIStore((state) => state.setModelBlendshapes);

  const { scene } = useGLTF(modelUrl);
  const { gl } = useThree();

  const headBoneRef = useRef(null);
  const hairBonesRef = useRef([]);
  const prevHeadRot = useRef({ y: 0, x: 0 });
  const hairPhysicsState = useRef({});
  const blendshapeTargetMapRef = useRef({});

  const loadedModelRef = useRef(null);

  useEffect(() => {
    return () => {
      if (modelUrl) {
        useGLTF.clear(modelUrl);
      }
    };
  }, [modelUrl]);

  // التحكم بلون الشاشة الخضراء ودقة الريندر خلف الكواليس
  useEffect(() => {
    const initialGreenScreen = useUIStore.getState().isGreenScreen;
    const initialPixelRatio = useUIStore.getState().pixelRatio;

    gl.setClearColor(
      initialGreenScreen ? "#00FF00" : "#000000",
      initialGreenScreen ? 1 : 0,
    );
    gl.setPixelRatio(initialPixelRatio);

    const unsubscribe = useUIStore.subscribe((state, prevState) => {
      if (state.isGreenScreen !== prevState?.isGreenScreen) {
        gl.setClearColor(
          state.isGreenScreen ? "#00FF00" : "#000000",
          state.isGreenScreen ? 1 : 0,
        );
      }
      if (state.pixelRatio !== prevState?.pixelRatio) {
        gl.setPixelRatio(state.pixelRatio);
      }
    });

    return () => unsubscribe();
  }, [gl]);

  useEffect(() => {
    if (!scene) {
      setAppError("المجسم غير موجود أو فشل تحميله.");
      return;
    }

    if (modelUrl !== "/Adam.glb" && loadedModelRef.current !== modelUrl) {
      setAppSuccess("تم تحميل ومعالجة المجسم الجديد بنجاح! 📦✨");
      loadedModelRef.current = modelUrl;
    }

    let head = null;
    const hairs = [];
    const allAvailableShapes = new Set();
    const targetMap = {};

    try {
      scene.traverse((child) => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.frustumCulled = false;
        }

        if (child.isBone) {
          const name = child.name.toLowerCase();
          if (name.includes("head") && !name.includes("nub")) head = child;
          if (child.name.startsWith("J_Sec_Hair")) {
            hairs.push(child);
            if (!child.userData.initRot)
              child.userData.initRot = child.rotation.clone();
            if (!hairPhysicsState.current[child.name]) {
              hairPhysicsState.current[child.name] = {
                offsetX: 0,
                velocityX: 0,
                offsetZ: 0,
                velocityZ: 0,
              };
            }
          }
        }

        if (child.isSkinnedMesh && child.morphTargetDictionary) {
          Object.entries(child.morphTargetDictionary).forEach(
            ([shapeName, index]) => {
              allAvailableShapes.add(shapeName);
              if (!targetMap[shapeName]) targetMap[shapeName] = [];
              targetMap[shapeName].push({ mesh: child, index: index });
            },
          );
        }
      });

      setModelBlendshapes(Array.from(allAvailableShapes).sort());
      headBoneRef.current = head;
      hairBonesRef.current = hairs;
      blendshapeTargetMapRef.current = targetMap;
    } catch (error) {
      setAppError("حدث خطأ أثناء معالجة بنية الهيكل.");
    }

    return () => {
      blendshapeTargetMapRef.current = {};
      headBoneRef.current = null;
      hairBonesRef.current = [];

      if (scene) {
        scene.traverse((object) => {
          if (object.isMesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material))
                object.material.forEach((mat) => mat.dispose());
              else object.material.dispose();
            }
          }
        });
      }
    };
  }, [scene, setAppError, setAppSuccess, setModelBlendshapes, modelUrl]);

  useFrame(() => {
    const mocapData = useFaceStore.getState().metrics;
    if (!mocapData || !scene) return;

    if (typeof recordCurrentFrame === "function") recordCurrentFrame(mocapData);

    const headBone = headBoneRef.current;
    if (headBone) {
      const isMirrored = useUIStore.getState().isMirrored;
      const enableHairPhysics = useUIStore.getState().enableHairPhysics;

      const targetY = isMirrored ? -mocapData.yaw : mocapData.yaw;
      const targetZ = isMirrored ? -mocapData.roll : mocapData.roll;

      if (isValidNumber(mocapData.yaw))
        headBone.rotation.y = THREE.MathUtils.lerp(
          headBone.rotation.y,
          targetY,
          0.15,
        );
      if (isValidNumber(mocapData.pitch))
        headBone.rotation.x = THREE.MathUtils.lerp(
          headBone.rotation.x,
          mocapData.pitch,
          0.15,
        );
      if (isValidNumber(mocapData.roll))
        headBone.rotation.z = THREE.MathUtils.lerp(
          headBone.rotation.z,
          targetZ,
          0.15,
        );

      // تفعيل أو تعطيل فيزياء الشعر بناءً على قائمة الإعدادات
      if (hairBonesRef.current.length > 0 && enableHairPhysics) {
        calculateHairPhysics(
          headBone,
          prevHeadRot.current,
          hairBonesRef.current,
          hairPhysicsState.current,
          isValidNumber,
        );
      }
    }

    Object.entries(mocapData).forEach(([shapeName, targetValue]) => {
      if (IGNORED_SHAPES.includes(shapeName) || !isValidNumber(targetValue))
        return;

      const targets = blendshapeTargetMapRef.current[shapeName];
      if (!targets) return;

      const isMouthShape =
        shapeName.toLowerCase().includes("mouth") ||
        shapeName.toLowerCase().includes("jaw");
      const finalValue = isMouthShape
        ? Math.min(targetValue * 1.5, 1)
        : targetValue;
      const lerpFactor = isMouthShape ? 0.45 : 0.2;

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const currentValue = target.mesh.morphTargetInfluences[target.index];

        // Epsilon Culling: منع الحسابات العبثية إذا لم يتغير التعبير
        if (Math.abs(currentValue - finalValue) > 0.001) {
          target.mesh.morphTargetInfluences[target.index] =
            THREE.MathUtils.lerp(currentValue, finalValue, lerpFactor);
        }
      }
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
      <OrbitControls
        enablePan={false}
        enableDamping={true}
        minDistance={0.5}
        maxDistance={4}
      />
    </>
  );
}

useGLTF.preload("/Adam.glb");
export default React.memo(ModelViewer);
