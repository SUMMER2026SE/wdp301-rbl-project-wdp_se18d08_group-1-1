import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  useGLTF,
  OrbitControls,
  Environment,
  ContactShadows,
  Html,
  Bounds,
  useBounds,
} from '@react-three/drei';

// ─── Internal: Load & tint the GLB model ─────────────────────────────────────
function CarModel({ modelUrl, carColor }) {
  const { scene } = useGLTF(modelUrl, true); // crossOrigin = 'anonymous'
  const bounds = useBounds();

  useEffect(() => {
    // 1. Collect all unique mesh materials and log them (dev helper)
    const allMaterials = new Set();
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => allMaterials.add(m.name));
      }
    });
    console.log('[CarViewer] materials in model:', [...allMaterials]);

    // 2. Check if any material is named 'BodyPaint' (exact) or contains 'body'/'paint'/'car' (loose)
    const hasBodyPaint = [...allMaterials].some(
      (name) => name === 'BodyPaint' || /body|paint|car|exterior|varnish/i.test(name),
    );

    scene.traverse((child) => {
      if (!child.isMesh) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (!mat) return;
        const shouldTint = hasBodyPaint
          ? mat.name === 'BodyPaint' || /body|paint|car|exterior|varnish/i.test(mat.name)
          : true; // fallback: tint every mesh material
        if (shouldTint) {
          mat.color.set(carColor);
          mat.metalness = 0.8;
          mat.roughness = 0.2;
          mat.needsUpdate = true;
        }
      });
    });

    bounds.refresh().fit();
  }, [scene, carColor, bounds]);

  return <primitive object={scene} />;
}

// ─── Internal: HTML fallback shown while Suspense waits ──────────────────────
function LoadingFallback() {
  return (
    <Html center>
      <p
        style={{
          color: '#eab308',
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        Đang tải mô hình 3D…
      </p>
    </Html>
  );
}

/**
 * CarViewer — renders a GLB car model from Cloudinary with real-time color.
 *
 * Props:
 *   modelUrl  {string}  Cloudinary raw URL to a .glb file
 *   carColor  {string}  Hex color applied to the `BodyPaint` material
 *   height    {number}  Canvas height in px (default 180)
 */
export default function CarViewer({ modelUrl, carColor = '#ffffff', height = 180 }) {
  if (!modelUrl) return null;

  return (
    <div style={{ width: '100%', height }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [3, 2, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          intensity={1.5}
          castShadow
        />
        <spotLight
          position={[-8, 8, -8]}
          angle={0.2}
          penumbra={1}
          intensity={0.6}
        />

        {/* Model + environment */}
        <Bounds fit clip observe margin={1.4}>
          <Suspense fallback={<LoadingFallback />}>
            <CarModel modelUrl={modelUrl} carColor={carColor} />
            <ContactShadows
              position={[0, -0.85, 0]}
              opacity={0.45}
              scale={10}
              blur={2.5}
              far={1.5}
            />
          </Suspense>
        </Bounds>
        <Environment preset="city" />

        {/* Controls */}
        <OrbitControls
          autoRotate
          autoRotateSpeed={1.5}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 6}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
