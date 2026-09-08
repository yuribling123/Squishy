// Renders the avatar eyes, mouth, and cheek details.
type FaceProps = {
  eyeSize: number;
  isDisliked: boolean;
};

function Eye({ x, size, isDisliked }: { x: number; size: number; isDisliked: boolean }) {
  return (
    <group position={[x, 0.02, 1.04]} scale={size}>
      <mesh
        castShadow
        scale={[0.16, isDisliked ? 0.11 : 0.2, 0.08]}
        rotation={[0, 0, isDisliked ? -x * 0.35 : 0]}
      >
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#332b26" roughness={0.55} />
      </mesh>
      <mesh position={[-0.035, 0.055, 0.075]} scale={0.035}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#fff8ef" />
      </mesh>
    </group>
  );
}

export function Face({ eyeSize, isDisliked }: FaceProps) {
  return (
    <group>
      <Eye x={-0.4} size={eyeSize} isDisliked={isDisliked} />
      <Eye x={0.4} size={eyeSize} isDisliked={isDisliked} />
      <mesh position={[0, -0.42, 1.06]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.14, 0.025, 12, 28, Math.PI]} />
        <meshStandardMaterial color="#81594f" roughness={0.65} />
      </mesh>
      <mesh position={[-0.72, -0.28, 0.88]} rotation={[0, 0, 0.16]} scale={[0.24, 0.11, 0.04]}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshBasicMaterial color="#dc7770" transparent opacity={0.28} />
      </mesh>
      <mesh position={[0.72, -0.28, 0.88]} rotation={[0, 0, -0.16]} scale={[0.24, 0.11, 0.04]}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshBasicMaterial color="#dc7770" transparent opacity={0.28} />
      </mesh>
    </group>
  );
}
