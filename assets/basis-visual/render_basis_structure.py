# Render separate front, side, and back previews without changing the saved front scene.
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


directory = Path(__file__).resolve().parent
scene = bpy.context.scene
camera = scene.camera
original_camera = camera.matrix_world.copy()
lights = [(obj, obj.matrix_world.copy()) for obj in scene.objects if obj.type == "LIGHT"]

for label, angle in [("front", 0.0), ("side", -math.pi / 2), ("back", math.pi)]:
    rotation = Matrix.Rotation(angle, 4, "Z")
    camera.matrix_world = rotation @ original_camera
    if label != "front":
        camera.location.z = 1.302
        target = Vector((0.0, 0.10, 1.302))
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    for light, transform in lights:
        light.matrix_world = rotation @ transform
    filename = "basis_preview.png" if label == "front" else f"basis_{label}_preview.png"
    scene.render.filepath = str(directory / filename)
    bpy.ops.render.render(write_still=True)

camera.matrix_world = original_camera
for light, transform in lights:
    light.matrix_world = transform
