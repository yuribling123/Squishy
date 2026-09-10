# Export a lightweight web copy of the finished Basis without changing the Blender source.
from pathlib import Path

import bpy


output = Path(__file__).resolve().parents[2] / "public" / "models" / "basis-character.glb"
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
for obj in bpy.context.scene.objects:
    if obj.type != "MESH":
        continue
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    target = 9000 if obj.name in {"PlainBlackTshirt", "LooseBlackPants"} else 2200
    if obj.name == "RoundFullFace":
        target = 5000
    if len(obj.data.polygons) > target:
        modifier = obj.modifiers.new("Web surface budget", "DECIMATE")
        modifier.ratio = target / len(obj.data.polygons)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.select_set(False)

for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    for node in material.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            for link in list(node.inputs["Base Color"].links):
                material.node_tree.links.remove(link)

for obj in bpy.context.scene.objects:
    obj.select_set(obj.type == "MESH")
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB", use_selection=True,
                          export_animations=False, export_cameras=False, export_lights=False,
                          export_yup=True, export_extras=False)
print("Web model:", output, output.stat().st_size, "bytes")
