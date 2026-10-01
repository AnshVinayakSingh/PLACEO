'use client'

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { sceneState } from './scene-state'

/**
 * A single quiet idea: a roadmap drawn as a thin line through six waypoints.
 * Bone-white = done, dim = ahead, one vermilion node = where you are.
 * No bloom, no glow, no postprocessing. Hairlines and dots only.
 */

const BONE = '#efe7da'
const DIM = '#4b443d'
const ACCENT = '#e0794f'

const NODES = [
  [-3.1, -2.0, 0.0],
  [-2.0, -1.1, 0.9],
  [-0.9, -1.0, -0.7],
  [0.4, -0.1, 0.5],
  [1.5, 0.6, -0.6],
  [2.3, 1.5, 0.6],
  [3.1, 2.3, 0.0],
].map(([x, y, z]) => new THREE.Vector3(x, y, z))

const SEGMENTS = (NODES.length - 1) * 26 // 156 -> every node lands on an exact index
const LAST = NODES.length - 1

function Waypoint({
  position,
  index,
  progress,
}: {
  position: THREE.Vector3
  index: number
  progress: MutableRefObject<number>
}) {
  const dot = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const t = index / LAST

  useFrame(({ clock }) => {
    const m = dot.current
    if (!m) return
    const p = progress.current
    const reached = p >= t - 0.001
    const current = reached && (index === LAST || p < (index + 1) / LAST - 0.001)
    const mat = m.material as THREE.MeshBasicMaterial
    mat.color.set(current ? ACCENT : reached ? BONE : DIM)
    const pulse = current ? 1.5 + Math.sin(clock.elapsedTime * 2.4) * 0.12 : 1
    m.scale.setScalar(pulse)

    const r = ring.current
    if (r) {
      r.visible = current
      const phase = (clock.elapsedTime * 0.6) % 1
      r.scale.setScalar(1 + phase * 1.4)
      ;(r.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - phase)
    }
  })

  return (
    <group position={position}>
      <mesh ref={dot}>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshBasicMaterial color={DIM} />
      </mesh>
      <mesh ref={ring} visible={false}>
        <ringGeometry args={[0.12, 0.135, 48]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Roadmap({ scrollDriven, animate }: { scrollDriven: boolean; animate: boolean }) {
  const group = useRef<THREE.Group>(null)
  const { viewport } = useThree()

  const target0 = scrollDriven ? 0.43 : 0.55
  const progress = useRef(animate ? 0 : target0)

  const { ghost, done, grid } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(NODES, false, 'catmullrom', 0.5)
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(SEGMENTS))
    const ghost = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: DIM, transparent: true, opacity: 0.6 }),
    )
    const done = new THREE.Line(geo.clone(), new THREE.LineBasicMaterial({ color: BONE }))
    const grid = new THREE.GridHelper(14, 14, DIM, DIM)
    const gm = grid.material as THREE.LineBasicMaterial
    gm.transparent = true
    gm.opacity = 0.2
    gm.depthWrite = false
    grid.position.y = -3.1
    return { ghost, done, grid }
  }, [])

  useEffect(
    () => () => {
      ghost.geometry.dispose()
      done.geometry.dispose()
      ;(ghost.material as THREE.Material).dispose()
      ;(done.material as THREE.Material).dispose()
      grid.geometry.dispose()
      ;(grid.material as THREE.Material).dispose()
    },
    [ghost, done, grid],
  )

  // Fit the whole path in any container, tall phone or ultrawide.
  const k = Math.min(viewport.width / 7.4, viewport.height / 5.6, 1.15)

  useFrame((state, dt) => {
    const target = scrollDriven ? 0.43 + sceneState.progress * 0.57 : 0.55
    progress.current = animate ? THREE.MathUtils.damp(progress.current, target, 2.2, dt) : target

    const g = group.current
    if (g) {
      const t = state.clock.elapsedTime
      const px = animate ? state.pointer.x : 0
      const py = animate ? state.pointer.y : 0
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -0.35 + px * 0.25 + Math.sin(t * 0.25) * 0.05, 3, dt)
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0.14 - py * 0.12, 3, dt)
    }
    done.geometry.setDrawRange(0, Math.max(2, Math.floor(progress.current * SEGMENTS) + 1))
  })

  return (
    <group ref={group} scale={k}>
      <primitive object={grid} />
      <primitive object={ghost} />
      <primitive object={done} />
      {NODES.map((p, i) => (
        <Waypoint key={i} position={p} index={i} progress={progress} />
      ))}
    </group>
  )
}

type Props = {
  /** true: line follows page scroll (hero). false: fixed state (auth panel). */
  scrollDriven?: boolean
  className?: string
}

export default function RoadmapScene({ scrollDriven = true, className }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(true)
  const [reduced, setReduced] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    try {
      const c = document.createElement('canvas')
      setSupported(!!(c.getContext('webgl2') || c.getContext('webgl')))
    } catch {
      setSupported(false)
    }
    setReady(true)

    const el = wrap.current
    if (!el) return
    // Stop rendering entirely when scrolled out of view (battery on phones).
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: '120px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={wrap} className={className} aria-hidden="true">
      {ready && supported && (
        <Canvas
          frameloop={visible && !reduced ? 'always' : 'demand'}
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 9], fov: 35 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
          style={{ touchAction: 'pan-y' }}
        >
          <Roadmap scrollDriven={scrollDriven} animate={!reduced} />
        </Canvas>
      )}
    </div>
  )
}
