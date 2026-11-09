import { useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from '@react-three/drei';
import { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';

// WASD 만 이동 키다. 다른 글자 키는 무시한다(예전엔 keys 에 q, e 같은 값이 쌓였다)
const MOVE_KEYS: Partial<Record<string, 'w' | 'a' | 's' | 'd'>> = {
  KeyW: 'w',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
};

const FreeCameraControls = () => {
  const controlsRef = useRef<PointerLockControlsImpl | null>(null);
  const direction = new THREE.Vector3();
  const speed = 10;
  const keys = useRef({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = MOVE_KEYS[e.code];
      if (key) keys.current[key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = MOVE_KEYS[e.code];
      if (key) keys.current[key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (!controlsRef.current?.getObject) return;
    const moveSpeed = speed * delta;
    direction.set(0, 0, 0);
    if (keys.current.w) direction.z -= moveSpeed;
    if (keys.current.s) direction.z += moveSpeed;
    if (keys.current.a) direction.x -= moveSpeed;
    if (keys.current.d) direction.x += moveSpeed;
    const cam = controlsRef.current.getObject();
    cam.translateX(direction.x);
    cam.translateZ(direction.z);
  });

  return <PointerLockControls ref={controlsRef} />;
};

export default FreeCameraControls;
