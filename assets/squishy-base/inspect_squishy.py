"""Validate authoring topology and render a morph contact sheet plus an articulated pose without changing the asset."""
import bpy
import bmesh
import json
import math
import sys
import runpy
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(OUT/'squishy_base.blend'))
mapping=runpy.run_path(str(OUT/'generate_squishy.py'))['proportion']
for z in [i/10 for i in range(39)]:
    for x in [-.9,-.4,0,.4,.9]:
        point=Vector((x,-.3,z))
        assert (Vector(mapping(mapping(point),True))-point).length<1e-6
scene=bpy.context.scene
rig=bpy.data.objects['SquishyRig']
base=list(bpy.data.collections['CHARACTER'].objects)
meshes=[o for o in base if o.type=='MESH']
report=[]
for obj in meshes:
    assert obj.location.length<1e-6 and (obj.scale-Vector((1,1,1))).length<1e-6
    bm=bmesh.new(); bm.from_mesh(obj.data)
    nonmanifold=sum(not e.is_manifold for e in bm.edges)
    zero_area=sum(f.calc_area()<1e-10 for f in bm.faces)
    assert not nonmanifold, (obj.name,nonmanifold)
    assert not zero_area, (obj.name,zero_area)
    assert all(k.value==0 for k in obj.data.shape_keys.key_blocks if k.name!='Basis')
    report.append({'mesh':obj.name,'vertices':len(bm.verts),'faces':len(bm.faces),
                   'nonManifoldEdges':nonmanifold,'zeroAreaFaces':zero_area})
    bm.free()
(OUT/'topology_report.json').write_text(json.dumps({'passed':True,'meshes':report},indent=2))

# An intentionally asymmetric articulation checks elbow, wrist, knee, head and torso weights.
for name,angles in {
    'Head':(0,-.16,-.10), 'Chest':(.05,0,.045),
    'UpperArm.L':(-.15,.1,-.63), 'LowerArm.L':(-.65,0,-.25), 'Hand.L':(.1,.18,.12),
    'UpperArm.R':(.12,-.08,.14), 'LowerArm.R':(-.3,0,0),
    'UpperLeg.L':(-.25,0,-.10), 'LowerLeg.L':(.50,0,0), 'Foot.L':(-.18,0,0),
}.items():
    bone=rig.pose.bones[name]; bone.rotation_mode='XYZ'; bone.rotation_euler=angles
scene.cycles.samples=16
scene.render.resolution_x=850; scene.render.resolution_y=1050
scene.render.filepath=str(OUT/'pose_check.png')
if '--sheet-only' not in sys.argv:
    bpy.ops.render.render(write_still=True)
if '--pose-only' in sys.argv:
    print('POSE_INSPECTION_COMPLETE')
    sys.exit(0)
for bone in rig.pose.bones:
    bone.rotation_euler=(0,0,0); bone.rotation_quaternion=(1,0,0,0)

# Optional orthographic inspection views use the final rest pose and final geometry.
if '--views' in sys.argv:
    camera=scene.camera
    old_location=camera.location.copy(); old_rotation=camera.rotation_euler.copy()
    for name,location in [('front',(0,-9,2.5)),('back',(4,8,3.2))]:
        camera.location=location
        camera.rotation_euler=(Vector((0,0,1.40))-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(OUT/(name+'.png'))
        bpy.ops.render.render(write_still=True)
    camera.location=old_location; camera.rotation_euler=old_rotation

# Duplicate only for the inspection sheet, never for GLB export.
for o in meshes: o.hide_render=True
bpy.data.objects['STUDIO_Floor'].hide_render=True
names=['Basis','Squash','Stretch','Flatten','HeadSquash','FacePullLeft','FacePullRight','FaceStretch','FaceSquash']
for i,name in enumerate(names):
    row,col=divmod(i,3)
    position=Vector(((col-1)*2.8,0,(1-row)*3.9))
    copy_rig=rig.copy(); copy_rig.data=rig.data.copy(); scene.collection.objects.link(copy_rig)
    copy_rig.location=position
    for obj in meshes:
        copy=obj.copy(); copy.data=obj.data.copy(); scene.collection.objects.link(copy)
        copy.parent=copy_rig; copy.hide_render=False
        for mod in copy.modifiers:
            if mod.type=='ARMATURE':mod.object=copy_rig
        for key in copy.data.shape_keys.key_blocks:
            key.value=1 if key.name==name and name!='Basis' else 0
    text=bpy.data.curves.new('Label_'+name,'FONT'); text.body=name
    text.align_x='CENTER'; text.size=.21; text.extrude=0
    label=bpy.data.objects.new('Label_'+name,text); scene.collection.objects.link(label)
    label.rotation_euler=(math.pi/2,0,0); label.location=position+Vector((0,-.6,-.40))
    text.materials.append(bpy.data.materials['Hair'])
for o in scene.objects:
    if o.type=='LIGHT':
        o.data.energy*=7
        o.data.size=10
        o.location*=2
scene.camera.location=(0,-30,1.65)
scene.camera.rotation_euler=(Vector((0,0,1.65))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.ortho_scale=13.1
scene.cycles.samples=16
scene.render.resolution_x=1200; scene.render.resolution_y=1550
scene.render.film_transparent=False
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.77,.74,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
scene.render.filepath=str(OUT/'morph_contact_sheet.png')
bpy.ops.render.render(write_still=True)
print('ASSET_INSPECTION_COMPLETE')
