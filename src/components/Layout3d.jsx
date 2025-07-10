import { Rnd } from 'react-rnd';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function Box() {
  return (
    <mesh rotation={[0.4, 0.2, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function ResizableMovableBox() {
  return (
    <Rnd
      default={{
        x: 50,
        y: 50,
        width: 600,
        height: 600,
      }}
      minWidth={200}
      minHeight={200}
      bounds="window"
      style={{
        background: '#eee',
        border: '1px solid #999',
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [3, 3, 3] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Box />
        <OrbitControls />
      </Canvas>
    </Rnd>
  );
}
