import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Center } from "@react-three/drei";
import { useFaceStore } from "../lib/globalStates";
import * as THREE from "three";

export default function ModelViewer() {
  const { scene } = useGLTF("/Adam.glb");
  const metrics = useFaceStore((state) => state.metrics);

  // إيقاف الـ Culling لضمان عدم اختفاء أي جزء عند حركة الرأس
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        child.frustumCulled = false;
        // تلميح: إذا لم تعمل الأشكال (Fm/Eyes)، افتح الكونسول لترى الأسماء الحقيقية:
        if (child.morphTargetDictionary) {
          console.log("Available Morph Targets:", Object.keys(child.morphTargetDictionary));
        }
      }
    });
  }, [scene]);

  useFrame(() => {
    // إذا لم تكن هناك بيانات، لا تفعل شيئاً
    if (!metrics) return;

    // القيم المحمية (لتجنب الـ NaN)
    const yaw = metrics.yaw || 0;
    const pitch = metrics.pitch || 0;
    const mouth = metrics.mouth || 0;
    const blink = metrics.blink || 0;

    // 1. تحريك الرأس (حركة أقوى وأسرع)
    const head = scene.getObjectByName("J_Bip_C_Head");
    if (head) {
      // 0.7 هي قوة الدوران (Multiplier)، و 0.2 هي سرعة الاستجابة (Lerp)
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, yaw * 0.7, 0.2);
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, pitch * 0.7, 0.2);
    }

    // 2. تحريك الفم والعيون
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        
        // فتح الفم
        const mouthIdx = child.morphTargetDictionary["Fcl_MTH_A"];
        if (mouthIdx !== undefined) {
          child.morphTargetInfluences[mouthIdx] = THREE.MathUtils.lerp(
            child.morphTargetInfluences[mouthIdx], 
            mouth, 
            0.5
          );
        }

        // إغلاق العيون (الرمش)
        // تأكد من اسم المفتاح في الكونسول، قد يكون Fcl_EYE_Closed أو Blink_L/R
        const blinkIdx = child.morphTargetDictionary["Fcl_EYE_Close"];
        if (blinkIdx !== undefined) {
          child.morphTargetInfluences[blinkIdx] = THREE.MathUtils.lerp(
            child.morphTargetInfluences[blinkIdx],
            blink,
            0.8 // الرمش يحتاج سرعة عالية
          );
        }
      }
    });
  });

  return (
    <>
      <ambientLight intensity={2} />
      <directionalLight position={[0, 5, 5]} intensity={1.5} />

      <Center>
        <primitive object={scene} />
      </Center>

      <OrbitControls
        enablePan={false}
        enableDamping={true}
        minDistance={0.5}
        maxDistance={4}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
        target={[0, 0, 0]}
      />
    </>
  );
}