# Refine mirrored hands, recessed neck contact, and overlapping left hair for the front Basis.
import math
from pathlib import Path

import bpy
from mathutils import Vector


DIRECTORY = Path(__file__).resolve().parent


def remove_object(name):
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)


def finish_mesh(name, vertices, faces, material):
    mesh = bpy.data.meshes.new(name + "Geometry")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    return obj


def rounded_outline(points, steps=10):
    result = []
    for index, point in enumerate(points):
        a, b, c, d = [Vector(points[i % len(points)]) for i in
                      (index - 1, index, index + 1, index + 2)]
        for step in range(steps):
            t = step / steps
            value = 0.5 * ((2 * b) + (-a + c) * t
                           + (2 * a - 5 * b + 4 * c - d) * t * t
                           + (-a + 3 * b - 3 * c + d) * t * t * t)
            result.append(tuple(value))
    return result


def pillow(name, outline, center, seam_y, front_depth, back_depth, material):
    boundary = rounded_outline(outline)
    count = len(boundary)
    rings = 48
    vertices = [(center[0], seam_y - front_depth, center[1])]
    for ring in range(1, rings):
        angle = math.pi * ring / rings
        radius = math.sin(angle)
        depth = front_depth if angle <= math.pi / 2 else back_depth
        y = seam_y - depth * math.cos(angle)
        for x, z in boundary:
            vertices.append((center[0] + (x - center[0]) * radius,
                             y, center[1] + (z - center[1]) * radius))
    vertices.append((center[0], seam_y + back_depth, center[1]))
    faces = [(0, 1 + i, 1 + (i + 1) % count) for i in range(count)]
    for ring in range(rings - 2):
        start = 1 + ring * count
        for i in range(count):
            j = (i + 1) % count
            faces.append((start + i, start + count + i,
                          start + count + j, start + j))
    last = 1 + (rings - 2) * count
    faces.extend((last + i, len(vertices) - 1, last + (i + 1) % count)
                 for i in range(count))
    return finish_mesh(name, vertices, faces, material)


def soft_block(name, center, scale, material, exponent=0.65, tilt=0):
    def signed_power(value):
        return math.copysign(abs(value) ** exponent, value)

    vertices = []
    segments, rings = 96, 48
    for ring in range(1, rings):
        latitude = -math.pi / 2 + math.pi * ring / rings
        for segment in range(segments):
            longitude = 2 * math.pi * segment / segments
            x = scale[0] * signed_power(math.cos(latitude)) * signed_power(math.cos(longitude))
            y = scale[1] * signed_power(math.cos(latitude)) * signed_power(math.sin(longitude))
            z = scale[2] * signed_power(math.sin(latitude))
            vertices.append((center[0] + x * math.cos(tilt) + z * math.sin(tilt),
                             center[1] + y,
                             center[2] - x * math.sin(tilt) + z * math.cos(tilt)))
    for sign in (-1, 1):
        vertices.append((center[0] + sign * scale[2] * math.sin(tilt), center[1],
                         center[2] + sign * scale[2] * math.cos(tilt)))
    faces = []
    for ring in range(rings - 2):
        for i in range(segments):
            a = ring * segments + i
            b = ring * segments + (i + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    for i in range(segments):
        j = (i + 1) % segments
        faces.append((len(vertices) - 2, j, i))
        start = (rings - 2) * segments
        faces.append((len(vertices) - 1, start + i, start + j))
    return finish_mesh(name, vertices, faces, material)


def fuse(objects, name, voxel=0.008, iterations=6):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    remesh = obj.modifiers.new("Blend soft volumes", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = voxel
    remesh.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth = obj.modifiers.new("Soften volume transitions", "SMOOTH")
    smooth.factor = 0.8
    smooth.iterations = iterations
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    subdivision = obj.modifiers.new("Smooth surface", "SUBSURF")
    subdivision.levels = 1
    bpy.ops.object.modifier_apply(modifier=subdivision.name)
    return obj


skin_material = bpy.data.materials["Warm soft silicone"]
hair_material = bpy.data.materials["Sculpted espresso silicone"]

# Mirror the existing left hand about the shirt center without changing its approved shape.
left_hand = bpy.data.objects["SmallArm_L"]
mirror_center = -0.005
vertices = []
for vertex in left_hand.data.vertices:
    position = left_hand.matrix_world @ vertex.co
    vertices.append((2 * mirror_center - position.x, position.y, position.z))
faces = [tuple(reversed(polygon.vertices[:])) for polygon in left_hand.data.polygons]
remove_object("SmallArm_R")
finish_mesh("SmallArm_R", vertices, faces, skin_material)

# A rounded neck is inset under the chin and remains embedded in the shirt opening.
remove_object("ShortNeck")
neck = soft_block("ShortNeck", (-0.004, 0.017, 1.102), (0.142, 0.103, 0.092),
                  skin_material, exponent=0.83)
neck_material = bpy.data.materials.get("Neck contact skin")
if neck_material is None:
    neck_material = skin_material.copy()
    neck_material.name = "Neck contact skin"
neck.data.materials.clear()
neck.data.materials.append(neck_material)
principled = next(node for node in neck_material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
base_color = tuple(principled.inputs["Base Color"].default_value)
principled.inputs["Subsurface Weight"].default_value = 0.035
occlusion = neck_material.node_tree.nodes.get("Neck contact occlusion")
if occlusion is None:
    occlusion = neck_material.node_tree.nodes.new("ShaderNodeAmbientOcclusion")
    occlusion.name = "Neck contact occlusion"
occlusion.inputs["Color"].default_value = base_color
occlusion.inputs["Distance"].default_value = 0.15
occlusion.samples = 32
occlusion.only_local = False
neck_material.node_tree.links.new(occlusion.outputs["Color"], principled.inputs["Base Color"])

# Gently lift the center of the existing collar to reduce exposed neck height.
shirt = bpy.data.objects["PlainBlackTshirt"]
if not shirt.get("neckline_lift_applied", False):
    for vertex in shirt.data.vertices:
        x, y, z = vertex.co
        t = max(0.0, min(1.0, (z - 0.975) / 0.07))
        lift = 0.013 * math.exp(-((x + 0.004) / 0.125) ** 2)
        vertex.co.z += lift * t * t * (3 - 2 * t)
    shirt["neckline_lift_applied"] = True
    shirt.data.update()


def reference_lock(name, points, center, seam, depth):
    def world(point):
        return ((point[0] - 260) * 0.00335, (827 - point[1]) * 0.00335 + 0.012)
    remove_object(name)
    return pillow(name, [world(point) for point in points], world(center),
                  seam, depth, 0.055, hair_material)


# Each lower lock has a broad, rounded convex outline without the former notched tips.
reference_lock("Hair_LeftLower", [
    (206, 239), (221, 244), (220, 267), (204, 299),
    (178, 330), (150, 357), (123, 384), (110, 388),
    (99, 377), (93, 356), (107, 325), (137, 288), (174, 257),
], (158, 312), -0.299, 0.093)

reference_lock("Hair_LeftMiddle", [
    (224, 194), (244, 195), (239, 219), (215, 256),
    (177, 293), (135, 320), (94, 340), (64, 346),
    (43, 339), (53, 318), (84, 280), (128, 242), (176, 211),
], (144, 270), -0.326, 0.087)

reference_lock("Hair_LeftSweep", [
    (252, 153), (266, 158), (259, 178), (237, 207),
    (202, 237), (164, 262), (126, 280), (98, 289),
    (87, 285), (102, 265), (135, 230), (173, 195), (216, 167),
], (180, 222), -0.374, 0.072)

bpy.ops.object.select_all(action="DESELECT")
scene = bpy.context.scene
scene.render.filepath = str(DIRECTORY / "basis_preview.png")
scene.render.image_settings.file_format = "PNG"
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(DIRECTORY / "basis_character.blend"))
bpy.ops.render.render(write_still=True)
