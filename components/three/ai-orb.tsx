'use client'

import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MeshDistortMaterial, Float, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

function Orb({ size = 1.6 }: { size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const { pointer } = useThree()

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15
      meshRef.current.rotation.x += delta * 0.05
    }
    if (groupRef.current) {
      // Gentle parallax toward the cursor — subtle, not a gimmick.
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        pointer.x * 0.3,
        0.04,
      )
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        -pointer.y * 0.2,
        0.04,
      )
    }
  })

  return (
    <group ref={groupRef}>
      <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.8}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[size, 8]} />
          <MeshDistortMaterial
            color="#6d5bfa"
            emissive="#3d2fb8"
            emissiveIntensity={0.4}
            distort={0.45}
            speed={1.8}
            roughness={0.15}
            metalness={0.6}
          />
        </mesh>
      </Float>
      <Sparkles count={60} scale={5.5} size={2.5} speed={0.3} color="#6ee3ff" opacity={0.6} />
    </group>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={40} color="#7dd3fc" />
      <pointLight position={[-4, -3, -4]} intensity={25} color="#a78bfa" />
    </>
  )
}

/**
 * Full interactive 3D hero scene. Client-only, heavier — intended for the
 * landing page hero where a strong first-impression "wow" matters most.
 */
export function AiOrbScene({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Lights />
          <Orb />
          <EffectComposer>
            <Bloom intensity={0.6} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}

/**
 * Lightweight ambient variant — no postprocessing, smaller draw calls.
 * Used as a decorative accent on dashboard/app pages so the whole product
 * feels consistent without paying the full WebGL cost everywhere.
 */
export function AiOrbAmbient({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }} dpr={[1, 1.25]} gl={{ alpha: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <pointLight position={[3, 3, 3]} intensity={20} color="#7dd3fc" />
          <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.6}>
            <mesh>
              <icosahedronGeometry args={[1.1, 6]} />
              <MeshDistortMaterial
                color="#6d5bfa"
                distort={0.35}
                speed={1.4}
                roughness={0.25}
                metalness={0.5}
                transparent
                opacity={0.5}
              />
            </mesh>
          </Float>
        </Suspense>
      </Canvas>
    </div>
  )
}
