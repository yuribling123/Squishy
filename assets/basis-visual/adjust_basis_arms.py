# Tuck the mirrored upper arms inside the existing sleeves without changing the clothing.
from pathlib import Path

import bpy


directory = Path(__file__).resolve().parent
left = bpy.data.objects["SmallArm_L"]
right = bpy.data.objects["SmallArm_R"]
center_x = -0.005

# Blend the adjustment into the upper arm while keeping the visible palm unchanged.
if not left.get("sleeve_tuck_applied", False):
    inverse = left.matrix_world.inverted()
    for vertex in left.data.vertices:
        position = left.matrix_world @ vertex.co
        amount = max(0.0, min(1.0, (position.z - 0.705) / 0.12))
        weight = amount * amount * (3.0 - 2.0 * amount)
        position.x += 0.055 * weight
        position.y += 0.055 * weight
        position.z -= 0.014 * weight
        vertex.co = inverse @ position
    left.data.update()
    left["sleeve_tuck_applied"] = True

right_inverse = right.matrix_world.inverted()
for source, target in zip(left.data.vertices, right.data.vertices):
    position = left.matrix_world @ source.co
    position.x = 2.0 * center_x - position.x
    target.co = right_inverse @ position
right.data.update()
right["sleeve_tuck_applied"] = True

scene = bpy.context.scene
scene.render.filepath = str(directory / "basis_preview.png")
scene.render.image_settings.file_format = "PNG"
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(directory / "basis_character.blend"))
bpy.ops.render.render(write_still=True)
