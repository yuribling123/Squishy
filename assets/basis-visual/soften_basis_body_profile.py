# Gently round clothing depth while preserving every vertex's front projection and overall proportions.
from pathlib import Path

import bpy
import numpy as np


def soften_depth(name, axis_y, edge_scale, middle_scale):
    obj = bpy.data.objects[name]
    if obj.get("final_soft_body_profile", False):
        return
    mesh = obj.data
    positions = np.empty(len(mesh.vertices) * 3, dtype=np.float64)
    mesh.vertices.foreach_get("co", positions)
    positions = positions.reshape((-1, 3))
    z = positions[:, 2]
    t = np.clip((z - z.min()) / (z.max() - z.min()), 0.0, 1.0)

    # Round the depth near the hem and shoulder/waist, retaining a subtly fuller middle.
    profile = np.sin(np.pi * t) ** 0.72
    scale = edge_scale + (middle_scale - edge_scale) * profile
    y = axis_y + (positions[:, 1] - axis_y) * scale

    # Smooth depth only, so the approved x/z contour cannot shrink or shift.
    edges = np.empty(len(mesh.edges) * 2, dtype=np.int32)
    mesh.edges.foreach_get("vertices", edges)
    edges = edges.reshape((-1, 2))
    first, second = edges[:, 0], edges[:, 1]
    degree = np.bincount(first, minlength=len(y)) + np.bincount(second, minlength=len(y))
    degree = np.maximum(degree, 1)
    for _ in range(16):
        neighbor_sum = np.bincount(first, weights=y[second], minlength=len(y))
        neighbor_sum += np.bincount(second, weights=y[first], minlength=len(y))
        y = 0.65 * y + 0.35 * neighbor_sum / degree

    positions[:, 1] = y
    mesh.vertices.foreach_set("co", positions.ravel())
    mesh.update()
    obj["final_soft_body_profile"] = True


soften_depth("PlainBlackTshirt", -0.048, 0.925, 1.018)
soften_depth("LooseBlackPants", -0.016, 0.90, 1.015)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).resolve().parent / "basis_character.blend"))
