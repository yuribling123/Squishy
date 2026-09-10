# Complete rear body volumes and restrained scalp layers while preserving all front-facing vertices.
import math
from pathlib import Path

import bpy


DIRECTORY = Path(__file__).resolve().parent


def smoothstep(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def deepen_back(name, seam, old_back, new_back):
    obj = bpy.data.objects[name]
    if obj.get("full_body_depth_completed", False):
        return
    for vertex in obj.data.vertices:
        if vertex.co.y > seam:
            fraction = (vertex.co.y - seam) / (old_back - seam)
            vertex.co.y = seam + fraction * (new_back - seam)
    obj.data.update()
    obj["full_body_depth_completed"] = True


# The front fabric and its hem stay fixed; the back follows a soft torso cross-section.
shirt = bpy.data.objects["PlainBlackTshirt"]
if not shirt.get("full_body_depth_completed", False):
    for vertex in shirt.data.vertices:
        x, y, z = vertex.co
        if y <= -0.048:
            continue
        fraction = max(0.0, min(1.0, (y + 0.048) / 0.118))
        side_taper = math.sqrt(max(0.0, 1.0 - (x / 0.565) ** 2))
        collar_taper = 1.0 - 0.27 * smoothstep((z - 0.93) / 0.16)
        hem_taper = 0.91 + 0.09 * smoothstep((z - 0.48) / 0.12)
        rear_depth = 0.39 * side_taper * collar_taper * hem_taper
        vertex.co.y = -0.048 + fraction * rear_depth
    shirt.data.update()
    shirt["full_body_depth_completed"] = True

# These existing rounded meshes retain their front surfaces and acquire matching rear depth.
deepen_back("LooseBlackPants", -0.016, 0.1277, 0.312)
deepen_back("BareFoot_L", -0.034, 0.0669, 0.258)
deepen_back("BareFoot_R", -0.034, 0.0669, 0.258)
deepen_back("SmallArm_L", -0.020, 0.1063, 0.214)
deepen_back("SmallArm_R", -0.020, 0.1063, 0.214)
deepen_back("ShortNeck", 0.017, 0.12, 0.285)
deepen_back("RoundFullFace", -0.030, 0.1425, 0.315)

# Add broad low relief directly to the continuous rear scalp, with no separate hair pieces.
scalp = bpy.data.objects["Hair_Base"]
if not scalp.get("back_layers_completed", False):
    for vertex in scalp.data.vertices:
        x, y, z = vertex.co
        if y <= 0.13:
            continue
        rear_mask = smoothstep((y - 0.13) / 0.24)
        left_flow = math.exp(-((x + 0.26) / 0.30) ** 4)
        right_flow = math.exp(-((x - 0.22) / 0.36) ** 4)
        first_curve = 2.15 - 0.34 * (x + 0.10) - 0.25 * (x + 0.10) ** 2
        second_curve = 1.91 - 0.40 * (x + 0.08) - 0.20 * (x + 0.08) ** 2
        third_curve = 1.71 + 0.34 * (x - 0.12)
        relief = 0.039 * math.exp(-((z - first_curve) / 0.082) ** 2) * right_flow
        relief += 0.030 * math.exp(-((z - second_curve) / 0.090) ** 2) * left_flow
        relief += 0.021 * math.exp(-((z - third_curve) / 0.087) ** 2) * right_flow
        vertex.co.y += rear_mask * relief
    scalp.data.update()
    scalp["back_layers_completed"] = True

bpy.ops.object.select_all(action="DESELECT")
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(DIRECTORY / "basis_character.blend"))
