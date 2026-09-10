# Extend the existing hair behind its unchanged front surface into a continuous rounded scalp.
import math
from pathlib import Path

import bpy


DIRECTORY = Path(__file__).resolve().parent
base = bpy.data.objects["Hair_Base"]


def smoothstep(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


# Keep the exact front contour and front hemisphere, expanding only the rear shell.
if not base.get("rounded_back_completed", False):
    for vertex in base.data.vertices:
        x, y, z = vertex.co
        if y <= 0.095:
            continue
        rear_fraction = min(1.0, (y - 0.095) / 0.055)
        back_depth = 0.64
        vertex.co.y = 0.095 + back_depth * rear_fraction

        # Two broad shallow sweeps create restrained layers within the same surface.
        rear_mask = smoothstep(rear_fraction / 0.75)
        upper_curve = 2.02 - 0.18 * x - 0.20 * x * x
        lower_curve = 1.74 + 0.14 * x - 0.12 * x * x
        upper = math.exp(-((z - upper_curve) / 0.095) ** 2)
        lower = math.exp(-((z - lower_curve) / 0.11) ** 2)
        side_fade = math.exp(-((x - 0.02) / 0.60) ** 6)
        vertex.co.y += rear_mask * side_fade * (0.014 * upper + 0.009 * lower)
    base.data.update()
    base["rounded_back_completed"] = True


# Carry the upper scalp forward beneath the unchanged fringe to soften the side junction.
if not base.get("upper_side_wrap_completed", False):
    for vertex in base.data.vertices:
        x, y, z = vertex.co
        upper_weight = smoothstep((z - 1.72) / 0.43)
        rear_fade = 1.0 - smoothstep((y - 0.095) / 0.58)
        vertex.co.y -= 0.235 * upper_weight * rear_fade
    base.data.update()
    base["upper_side_wrap_completed"] = True


# Extend each rear half into the scalp; its visible front half stays untouched.
roots = {
    "Hair_CenterFringe": (-0.338, 0.055),
    "Hair_RightFringe": (-0.315, 0.055),
    "Hair_RightMass": (-0.265, 0.055),
    "Hair_LeftLower": (-0.299, 0.055),
    "Hair_LeftMiddle": (-0.326, 0.055),
    "Hair_LeftSweep": (-0.374, 0.055),
    "Hair_TopSweep": (-0.385, 0.055),
    "Hair_CrownCurl": (-0.239, 0.055),
}

for name, (seam, old_depth) in roots.items():
    obj = bpy.data.objects[name]
    if obj.get("scalp_root_completed", False):
        continue
    for vertex in obj.data.vertices:
        x, y, z = vertex.co
        if y <= seam:
            continue
        fraction = min(1.0, (y - seam) / old_depth)
        if name == "Hair_CrownCurl":
            # Sink the crest's base into the crown without thickening its high tip.
            root_weight = 1.0 - smoothstep((z - 2.27) / 0.17)
            added_depth = 0.30 * root_weight + 0.045
        else:
            # Low fringe ends remain shallow beside the face; upper roots join the cap.
            root_weight = smoothstep((z - 1.53) / 0.34)
            crown_fade = 1.0 - 0.50 * smoothstep((z - 2.24) / 0.16)
            added_depth = (0.055 + 0.42 * root_weight) * crown_fade
        vertex.co.y += added_depth * fraction
    obj.data.update()
    obj["scalp_root_completed"] = True

bpy.ops.object.select_all(action="DESELECT")
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(DIRECTORY / "basis_character.blend"))
