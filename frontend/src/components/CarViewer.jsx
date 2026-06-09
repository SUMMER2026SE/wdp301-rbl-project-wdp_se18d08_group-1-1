import { Suspense, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import {
  useGLTF,
  OrbitControls,
  Environment,
  ContactShadows,
  Html,
  Bounds,
  useBounds,
} from '@react-three/drei';

// Target max dimension (meters) every model is normalized to.
// Changing this one constant zooms all models in/out uniformly.
const MODEL_TARGET_SIZE = 3.5;

// ─── Point DRACOLoader at the Google CDN decoder (set once at module level) ───
// Required to decode Draco-compressed GLB files produced by gltf-pipeline on
// the backend. Must be called before any useGLTF() invocation.
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

// ─── Internal: Load & tint the GLB model ─────────────────────────────────────
function CarModel({ modelUrl, carColor }) {
  const { scene } = useGLTF(modelUrl);
  const bounds = useBounds();
  // Ref để gọi bounds.refresh().fit() đúng 1 lần sau khi model load,
  // không đưa bounds vào dependency array (bounds thay đổi reference mỗi render).
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  // ── Cleanup khi model thay đổi hoặc unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      useGLTF.clear(modelUrl);
    };
  }, [modelUrl]);

  // ── Effect 1: Scale + ground — chỉ chạy khi scene (model) thay đổi ─────────
  // KHÔNG đưa bounds vào dependency: bounds tạo reference mới mỗi render,
  // nếu đưa vào thì effect chạy lại liên tục → xe giật lên giật xuống.
  useEffect(() => {
    scene.scale.set(1, 1, 1);
    scene.position.set(0, 0, 0);

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      scene.scale.setScalar(MODEL_TARGET_SIZE / maxDim);
    }

    // Ground: đáy xe về Y = 0
    const boxAfterScale = new THREE.Box3().setFromObject(scene);
    scene.position.y = -boxAfterScale.min.y;

    // Đọc bounds qua ref → không cần bounds trong dependency array
    boundsRef.current.refresh().fit();

    // Dịch model xuống dưới trong world space (sau khi camera đã fit xong)
    // → xe hiện ở phần dưới canvas thay vì giữa màn hình.
    scene.position.y -= 0.6;
  }, [scene]); // ← chỉ scene, không có bounds

  // ── Effect 2: Tint màu — chỉ chạy khi carColor thay đổi ──────────────────
  useEffect(() => {
    const allMaterials = new Set();
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => allMaterials.add(m.name));
      }
    });

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
          : true;
        if (shouldTint) {
          mat.color.set(carColor);
          mat.metalness = 0.8;
          mat.roughness = 0.2;
          mat.needsUpdate = true;
        }
      });
    });
  }, [scene, carColor]);

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
 * CarViewer — renders a Draco-compressed GLB car model from Cloudinary.
 *
 * Props:
 *   modelUrl  {string}  Cloudinary raw URL to a .glb file (Draco-compressed)
 *   carColor  {string}  Initial hex color applied to the BodyPaint material
 *   height    {number}  Canvas height in px (default 180)
 *
 * Ref API (via forwardRef):
 *   ref.current.changeCarColor(hexColor: string) — update paint color imperatively.
 *
 * Usage example:
 *   const viewerRef = useRef();
 *   <CarViewer ref={viewerRef} modelUrl={url} carColor="#c0392b" />
 *   <button onClick={() => viewerRef.current.changeCarColor('#2980b9')}>Blue</button>
 */
const CarViewer = forwardRef(function CarViewer({ modelUrl, carColor = '#ffffff', height = 180, boundsMargin = 1.1 }, ref) {
  // ── Internal color state — controlled by prop OR by imperative changeCarColor ──
  const [activeColor, setActiveColor] = useState(carColor);

  // Sync when parent updates the carColor prop
  useEffect(() => {
    setActiveColor(carColor);
  }, [carColor]);

  // ── Expose changeCarColor() so parent can call it without lifting state ──────
  useImperativeHandle(ref, () => ({
    /**
     * changeCarColor(hexColor)
     * Call this from a color-picker button to repaint the car body in real time.
     * @param {string} hexColor — e.g. '#2980b9'
     */
    changeCarColor: (hexColor) => setActiveColor(hexColor),
  }), []);

  if (!modelUrl) return null;

  return (
    <div style={{ width: '100%', height }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [3, 2, 5], fov: 55 }}
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
        {/* ContactShadows is intentionally placed OUTSIDE <Bounds> so its large
            scale plane (scale=10) does not inflate the bounding box and cause
            Bounds to zoom out — that was making smaller models appear tiny. */}
        <Bounds fit clip margin={boundsMargin}>
          <Suspense fallback={<LoadingFallback />}>
            <CarModel modelUrl={modelUrl} carColor={activeColor} />
          </Suspense>
        </Bounds>
        <Suspense fallback={null}>
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.45}
            scale={10}
            blur={2.5}
            far={1.5}
          />
        </Suspense>
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
});

export default CarViewer;
