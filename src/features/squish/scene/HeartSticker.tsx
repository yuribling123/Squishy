// Renders a heart decal anchored in a deforming body part's local coordinates.
import { useMemo } from "react";
import { DoubleSide, Quaternion, Shape, Vector3 } from "three";

export type Sticker = {
  id: number;
  point: [number, number, number];
  normal: [number, number, number];
};

export function HeartSticker({ sticker }: { sticker: Sticker }) {
  const shape = useMemo(() => {
    const heart = new Shape();
    heart.moveTo(0, -0.14);
    heart.bezierCurveTo(-0.32, 0.04, -0.15, 0.27, 0, 0.12);
    heart.bezierCurveTo(0.15, 0.27, 0.32, 0.04, 0, -0.14);
    return heart;
  }, []);
  const rotation = useMemo(() => new Quaternion().setFromUnitVectors(
    new Vector3(0, 0, 1), new Vector3(...sticker.normal).normalize(),
  ), [sticker.normal]);

  return (
    <mesh position={sticker.point} quaternion={rotation} raycast={() => null}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color="#e989a7" side={DoubleSide} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}
