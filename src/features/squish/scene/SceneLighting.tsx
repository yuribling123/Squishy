// Defines the lights used to illuminate the avatar scene.
export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={1.35} />
      <hemisphereLight args={["#fff7ed", "#a98c72", 1.25]} />
      <spotLight
        position={[-4, 6, 6]}
        angle={0.48}
        penumbra={0.9}
        intensity={75}
        castShadow
        color="#fff2e6"
      />
      <pointLight position={[4, 2, 4]} intensity={16} color="#ffd1b7" />
    </>
  );
}
