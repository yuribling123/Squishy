# Refine rear clothing connections and add shallow scalp-following hair layers without changing the front.
import math
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def ramp(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


for name, side in [("SmallArm_L", -1), ("SmallArm_R", 1)]:
    obj = bpy.data.objects[name]
    if obj.get("rear_joint_refined", False):
        continue
    for vertex in obj.data.vertices:
        x, y, z = vertex.co
        weight = ramp((y + 0.015) / 0.14) * ramp((z - 0.705) / 0.11)
        vertex.co.x -= side * 0.066 * weight
        vertex.co.z -= 0.021 * weight
        vertex.co.y -= 0.065 * weight
    obj.data.update()
    obj["rear_joint_refined"] = True

for name in ["BareFoot_L", "BareFoot_R"]:
    obj = bpy.data.objects[name]
    for vertex in obj.data.vertices:
        x, y, z = vertex.co
        if y > 0.06 and z > 0.135:
            weight = ramp((z - 0.135) / 0.04)
            vertex.co.y = y * (1 - weight) + min(y, 0.105) * weight
    obj.data.update()

pants = bpy.data.objects["LooseBlackPants"]
for vertex in pants.data.vertices:
    x, y, z = vertex.co
    if y > 0.1 and z > 0.465:
        weight = ramp((z - 0.465) / 0.047)
        vertex.co.y = y * (1 - weight) + min(y, 0.245) * weight
pants.data.update()

scalp = bpy.data.objects["Hair_Base"]
tree = BVHTree.FromObject(scalp, bpy.context.evaluated_depsgraph_get())
material = scalp.data.materials[0]


def smooth_outline(points):
    result = []
    for index in range(len(points)):
        a, b, c, d = [Vector(points[i % len(points)]) for i in
                      (index - 1, index, index + 1, index + 2)]
        for step in range(8):
            t = step / 8
            p = 0.5 * (2*b + (-a+c)*t + (2*a-5*b+4*c-d)*t*t + (-a+3*b-3*c+d)*t*t*t)
            result.append(p)
    return result


def layer(name, points, center, relief):
    if bpy.data.objects.get(name):
        return
    outline = smooth_outline(points)
    center = Vector(center)
    count, rings = len(outline), 22

    def surface(x, z, radius):
        location, normal, index, distance = tree.ray_cast(Vector((x, 2.0, z)), Vector((0, -1, 0)))
        if location is None:
            raise RuntimeError("Rear hair layer falls outside the existing scalp")
        height = relief * max(0.0, 1 - radius * radius) ** 1.4 - 0.009
        return (x, location.y + height, z)

    vertices = [surface(center.x, center.y, 0)]
    for ring in range(1, rings + 1):
        radius = ring / rings
        for point in outline:
            p = center.lerp(point, radius)
            vertices.append(surface(p.x, p.y, radius))
    faces = [(0, 1+i, 1+(i+1) % count) for i in range(count)]
    for ring in range(rings - 1):
        a = 1 + ring * count
        for i in range(count):
            j = (i+1) % count
            faces.append((a+i, a+count+i, a+count+j, a+j))
    mesh = bpy.data.meshes.new(name + "Geometry")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True


layer("Hair_BackUpperSweep", [
    (-0.22, 2.25), (-0.06, 2.29), (0.17, 2.24), (0.37, 2.12),
    (0.57, 1.97), (0.51, 1.94), (0.26, 1.99), (0.02, 2.07),
], (0.15, 2.13), 0.065)
layer("Hair_BackMiddleSweep", [
    (-0.37, 2.18), (-0.23, 2.20), (-0.04, 2.07), (0.09, 1.91),
    (0.30, 1.78), (0.23, 1.76), (-0.03, 1.82), (-0.26, 1.97),
], (-0.10, 1.99), 0.058)
layer("Hair_BackSideSweep", [
    (-0.49, 2.06), (-0.36, 2.12), (-0.28, 1.98), (-0.29, 1.78),
    (-0.17, 1.59), (-0.24, 1.58), (-0.44, 1.71), (-0.52, 1.90),
], (-0.38, 1.87), 0.047)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).resolve().parent / "basis_character.blend"))
