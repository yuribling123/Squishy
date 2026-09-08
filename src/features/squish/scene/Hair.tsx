// Renders the selected hairstyle using procedural 3D shapes.
type HairProps = {
  style: number;
  color: string;
};

function HairMaterial({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.74} />;
}

export function Hair({ style, color }: HairProps) {
  if (style === 2) {
    return (
      <group>
        <mesh position={[0, 0.56, 0]} scale={[1.33, 0.72, 1.17]} castShadow>
          <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
          <HairMaterial color={color} />
        </mesh>
        <mesh position={[0, 1.13, 0]} scale={[0.34, 0.44, 0.34]} castShadow>
          <sphereGeometry args={[1, 28, 20]} />
          <HairMaterial color={color} />
        </mesh>
      </group>
    );
  }

  if (style === 1) {
    const fringePositions = [-0.62, -0.28, 0.08, 0.43, 0.7];

    return (
      <group>
        <mesh position={[0, 0.45, -0.02]} scale={[1.38, 0.86, 1.2]} castShadow>
          <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
          <HairMaterial color={color} />
        </mesh>
        {fringePositions.map((x, index) => (
          <mesh
            key={x}
            position={[x, 0.18 + Math.abs(index - 2) * 0.04, 1.01]}
            rotation={[0, 0, (index - 2) * -0.09]}
            scale={[0.31, 0.48, 0.12]}
            castShadow
          >
            <sphereGeometry args={[1, 20, 16]} />
            <HairMaterial color={color} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.57, -0.03]} scale={[1.34, 0.69, 1.16]} castShadow>
        <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.64]} />
        <HairMaterial color={color} />
      </mesh>
      <mesh
        position={[-0.48, 0.24, 1.01]}
        rotation={[0, 0, -0.25]}
        scale={[0.46, 0.25, 0.12]}
        castShadow
      >
        <sphereGeometry args={[1, 20, 16]} />
        <HairMaterial color={color} />
      </mesh>
      <mesh
        position={[0.16, 0.28, 1.04]}
        rotation={[0, 0, 0.13]}
        scale={[0.64, 0.23, 0.12]}
        castShadow
      >
        <sphereGeometry args={[1, 20, 16]} />
        <HairMaterial color={color} />
      </mesh>
    </group>
  );
}
