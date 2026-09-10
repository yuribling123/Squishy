"""Generate a palm-style collectible silicone doll with modular meshes, a fitted skeleton, and shared morphs."""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

# Blender coordinates: meters, Z up, front -Y, character left +X.
# Change these material colors and construction functions to create reusable presets.
PALETTE = {
    'Skin': ('EEC6AC', .60, .065),
    'EarBlush': ('D89D89', .65, .035),
    'Hair': ('171719', .72, 0),
    'HairAccent': ('30292C', .69, 0),
    'Eyes': ('302729', .26, 0),
    'EyeWhite': ('F2E7DE', .39, 0),
    'Mouth': ('88625C', .65, 0),
    'Tshirt': ('151518', .77, 0),
    'Rib': ('758894', .9, 0),
    'Seam': ('A4B2BB', .86, 0),
    'Pants': ('151518', .77, 0),
    'PantsSeam': ('5A5761', .9, 0),
    'Socks': ('E9E6DE', .9, 0),
    'Shoes': ('F1EEE6', .74, 0),
    'Sole': ('D8D5D0', .78, 0),
    'ShoePanel': ('BCC4C7', .78, 0),
    'Glasses': ('766B63', .48, 0),
}
MORPHS = ['Squash', 'Stretch', 'Flatten', 'HeadSquash', 'FacePullLeft',
          'FacePullRight', 'FaceStretch', 'FaceSquash']
HEAD_CENTER = 3.12
MATERIALS = {}
PARTS = []
BONES = {}
DESIGN_PREVIEW_ONLY = False


def linear(v):
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4


def make_material(name, spec):
    color, roughness, subsurface = spec
    rgb = [linear(int(color[i:i+2], 16) / 255) for i in (0, 2, 4)]
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['IOR'].default_value = 1.42 if name == 'Skin' else 1.46
    if name=='Hair':bsdf.inputs['Specular IOR Level'].default_value=.28
    bsdf.inputs['Subsurface Weight'].default_value = subsurface
    bsdf.inputs['Subsurface Radius'].default_value = (1, .48, .28)
    bsdf.inputs['Subsurface Scale'].default_value = .035
    # Plain PBR fallback exports to glTF; Blender-only SSS is documented in extras.
    mat['surfaceClass'] = 'soft-silicone' if subsurface else 'matte-toy'
    mat['blenderSubsurfaceWeight'] = subsurface
    mat['blenderSubsurfaceScale'] = .035
    mat['blenderSubsurfaceRadius'] = [1.,.48,.28]
    return mat


def smooth(a, b, x):
    t = min(1., max(0., (x-a)/(b-a)))
    return t*t*(3-2*t)


def canonical_deformation(co, key):
    x, y, z = co
    if key == 'Squash':
        return (x*1.18, y*1.18, z*.73)
    if key == 'Stretch':
        return (x*.88, y*.88, z*1.29)
    if key == 'Flatten':
        return (x*1.22, y*.36, z*.96)
    head = smooth(2.51, 2.77, z)
    if key == 'HeadSquash':
        return (x*(1+.24*head), y*(1+.13*head), z-(z-HEAD_CENTER)*.28*head)
    # A broad front-face field moves features and underlying skin together.
    face = head * (1-smooth(3.43, 3.68, z)) * (1-smooth(-.24, .08, y))
    if key in ('FacePullLeft', 'FacePullRight'):
        sign = 1 if key == 'FacePullLeft' else -1
        weight = math.exp(-((x-sign*.22)/.43)**2 - ((z-3.06)/.39)**2) * face
        return (x+sign*.27*weight, y-.055*weight, z+.035*weight)
    if key == 'FaceStretch':
        return (x*(1+.29*face), y-.025*face, z+(z-3.10)*.10*face)
    if key == 'FaceSquash':
        return (x*(1+.12*face), y-.035*face, z-(z-3.10)*.29*face)
    return co


# One monotone proportion map fits every mesh, accessory and rest bone together.
# The source construction remains in canonical coordinates for predictable weights.
HEIGHT_MAP=[(0,0),(.39,.27),(1.0,.59),(1.5,.91),(2.4,1.48),(2.625,1.55),(3.735,2.66)]

def map_height(z, inverse=False):
    points=[(b,a) for a,b in HEIGHT_MAP] if inverse else HEIGHT_MAP
    for i in range(len(points)-1):
        a,b=points[i]; c,d=points[i+1]
        if z<=c or i==len(points)-2:
            return b+(z-a)*(d-b)/(c-a)


def proportion(co, inverse=False):
    x,y,z=co
    canonical_z=map_height(z,True) if inverse else z
    head=smooth(2.42,2.66,canonical_z)
    sx=1+.42*head
    sy=1.08+.17*head
    if inverse:
        x/=sx; y/=sy
        if abs(x)>.45 and head<1:
            x=math.copysign(.45+(abs(x)-.45)/(1-.32*(1-head)),x)
        return (x,y,canonical_z)
    if abs(x)>.45 and head<1:
        x=math.copysign(.45+(abs(x)-.45)*(1-.32*(1-head)),x)
    return (x*sx,y*sy,map_height(z))


def deformation(co,key):
    x,y,z=co
    if key=='Squash':return (x*1.18,y*1.18,z*.73)
    if key=='Stretch':return (x*.88,y*.88,z*1.29)
    if key=='Flatten':return (x*1.22,y*.36,z*.96)
    return proportion(canonical_deformation(proportion(co,True),key))


class MeshBuilder:
    """Assemble explicit ring topology with named material regions and deterministic weights."""
    def __init__(self, name, slot):
        self.name, self.slot = name, slot
        self.verts, self.faces, self.mats, self.weights = [], [], [], []
        self.material_names = []

    def vert(self, p, weight):
        self.verts.append(tuple(p))
        w = weight(Vector(p)) if callable(weight) else {weight: 1.}
        total = sum(w.values())
        self.weights.append({k: v/total for k, v in w.items() if v > 1e-6})
        return len(self.verts)-1

    def face(self, ids, material):
        if material not in self.material_names:
            self.material_names.append(material)
        self.faces.append(tuple(ids))
        self.mats.append(self.material_names.index(material))

    def ellipsoid(self, center, radii, material, weight, segments=24, rings=14, shape=None):
        c, r = Vector(center), Vector(radii)
        top = self.vert(c+Vector((0,0,r.z)), weight)
        rows = []
        for j in range(1, rings):
            phi = math.pi*j/rings
            row = []
            for i in range(segments):
                theta = 2*math.pi*i/segments
                p = Vector((r.x*math.sin(phi)*math.cos(theta),
                            r.y*math.sin(phi)*math.sin(theta), r.z*math.cos(phi)))
                if shape:
                    p = Vector(shape(p, phi, theta))
                row.append(self.vert(c+p, weight))
            rows.append(row)
        bottom = self.vert(c-Vector((0,0,r.z)), weight)
        for i in range(segments):
            k = (i+1)%segments
            self.face((top, rows[0][i], rows[0][k]), material)
            for a,b in zip(rows, rows[1:]):
                self.face((a[i], b[i], b[k], a[k]), material)
            self.face((rows[-1][i], bottom, rows[-1][k]), material)

    def tube(self, points, radii, material, weight, sides=16, depths=None):
        pts = [Vector(p) for p in points]
        rows = []
        for j,p in enumerate(pts):
            tangent = (pts[min(j+1,len(pts)-1)]-pts[max(0,j-1)]).normalized()
            u = tangent.cross(Vector((0,1,0))).normalized()
            if u.length < .1:
                u = tangent.cross(Vector((1,0,0))).normalized()
            v = tangent.cross(u).normalized()
            depth = depths[j] if depths else radii[j]
            rows.append([self.vert(p+u*(radii[j]*math.cos(i*2*math.pi/sides))
                           +v*(depth*math.sin(i*2*math.pi/sides)), weight) for i in range(sides)])
        start, end = self.vert(pts[0],weight), self.vert(pts[-1],weight)
        for i in range(sides):
            k=(i+1)%sides
            self.face((start,rows[0][k],rows[0][i]),material)
            for a,b in zip(rows,rows[1:]):
                self.face((a[i],a[k],b[k],b[i]),material)
            self.face((end,rows[-1][i],rows[-1][k]),material)

    def curve(self, controls, radius, material, weight, steps=20, sides=8, taper=False, depth_ratio=1.):
        # Cubic Bezier for soft sculpted locks, seams, cords and facial lines.
        a,b,c,d = map(Vector,controls)
        points=[]; radii=[]
        for i in range(steps+1):
            t=i/steps
            points.append((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d)
            radii.append(max(.0015,radius*(math.sin(math.pi*t)**.55 if taper else 1)))
        self.tube(points,radii,material,weight,sides,depths=[r*depth_ratio for r in radii])

    def finish(self, armature, collection):
        mesh=bpy.data.meshes.new(self.name+'_Geometry')
        mesh.from_pydata(self.verts, [], self.faces)
        mesh.update()
        obj=bpy.data.objects.new(self.name,mesh)
        collection.objects.link(obj)
        for name in self.material_names:
            mesh.materials.append(MATERIALS[name])
        for face,mat in zip(mesh.polygons,self.mats):
            face.material_index=mat
            face.use_smooth=True
        # Consistent outward normals even for clockwise paths and mirrored parts.
        import bmesh
        bm=bmesh.new(); bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(mesh); bm.free()
        groups={name:obj.vertex_groups.new(name=name) for name in BONES}
        for i,weights in enumerate(self.weights):
            for name,w in weights.items():
                groups[name].add([i],w,'REPLACE')
        # Fuse intersecting shells within a slot before morph creation. This removes
        # toy-part seams while keeping Hair, Head, Top, Bottom, etc. replaceable.
        if self.slot in ('body', 'head', 'hair', 'tops', 'bottoms'):
            fuse_surface(obj, self.slot)
            mesh=obj.data
        for vertex in mesh.vertices:
            vertex.co=proportion(vertex.co)
        mesh.update()
        obj.parent=armature
        mod=obj.modifiers.new('SharedSkeleton','ARMATURE')
        mod.object=armature
        mod.use_deform_preserve_volume=False  # Match glTF linear blend skinning.
        obj.shape_key_add(name='Basis', from_mix=False)
        if not DESIGN_PREVIEW_ONLY:
            for name in MORPHS:
                key=obj.shape_key_add(name=name, from_mix=False)
                key.value=0.
                key.slider_min=0.; key.slider_max=1.
                for p,out in zip(mesh.vertices,key.data):
                    out.co=deformation(p.co,name)
        obj['slot']=self.slot
        obj['skeletonId']='squishy-humanoid-palm-v2'
        obj['morphSet']='silicone-v1'
        obj['morphSynchronization']='Set the same named target on every active modular mesh.'
        PARTS.append(obj)
        return obj


def fuse_surface(obj,slot):
    """Union a slot, smooth it, and transfer original weights to a bounded triangulated surface."""
    from mathutils.bvhtree import BVHTree
    source=obj.data.copy()
    source.calc_loop_triangles()
    triangles=[tuple(t.vertices) for t in source.loop_triangles]
    tree=BVHTree.FromPolygons([v.co for v in source.vertices], triangles, all_triangles=True)
    source_weights=[{g.group:g.weight for g in v.groups} for v in source.vertices]
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True); bpy.context.view_layer.objects.active=obj
    remesh=obj.modifiers.new('UnionWithinSlot','REMESH')
    remesh.mode='VOXEL'
    remesh.voxel_size={'body':.026,'head':.017,'hair':.018,'tops':.025,'bottoms':.025,'shoes':.016}[slot]
    remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth_mod=obj.modifiers.new('SoftSurface','SMOOTH')
    smooth_mod.factor=.95; smooth_mod.iterations=12 if slot=='hair' else 4
    bpy.ops.object.modifier_apply(modifier=smooth_mod.name)
    decimate=obj.modifiers.new('WebTriangleBudget','DECIMATE')
    decimate.ratio={'body':.15,'head':.26,'hair':.23,'tops':.21,'bottoms':.20,'shoes':.36}[slot]
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    # Barycentric interpolation reproduces smooth joint weights on the union.
    for group in obj.vertex_groups: group.remove(list(range(len(obj.data.vertices))))
    for vertex in obj.data.vertices:
        point,normal,idx,distance=tree.find_nearest(vertex.co)
        ids=triangles[idx]
        a,b,c=(source.vertices[i].co for i in ids)
        v0,v1,v2=b-a,c-a,point-a
        d00,d01,d11=v0.dot(v0),v0.dot(v1),v1.dot(v1)
        denominator=d00*d11-d01*d01
        if abs(denominator)<1e-16:
            bary=[1.,0.,0.]
        else:
            vb=(d11*v2.dot(v0)-d01*v2.dot(v1))/denominator
            vc=(d00*v2.dot(v1)-d01*v2.dot(v0))/denominator
            bary=[max(0,1-vb-vc),max(0,vb),max(0,vc)]
        weights={}
        for index,amount in zip(ids,bary):
            for group,value in source_weights[index].items():
                weights[group]=weights.get(group,0)+amount*value
        weights=dict(sorted(weights.items(),key=lambda kv:-kv[1])[:4])
        total=sum(weights.values())
        for group,value in weights.items():
            if value>1e-7:obj.vertex_groups[group].add([vertex.index],value/total,'REPLACE')
    for poly in obj.data.polygons:
        poly.material_index=0; poly.use_smooth=True
    bpy.data.meshes.remove(source)


def torso_weight(p):
    t=smooth(1.48,1.99,p.z)
    shoulder=smooth(.29,.61,abs(p.x))*smooth(1.82,2.14,p.z)
    side='L' if p.x>=0 else 'R'
    return {'Pelvis':(1-t)*(1-shoulder),'Chest':t*(1-shoulder),'UpperArm.'+side:shoulder}


def arm_weight(sign):
    suffix='L' if sign>0 else 'R'
    def weight(p):
        # The elbow blend spans several sleeve rings instead of a rigid seam.
        lower=1-smooth(1.86,2.10,p.z)
        hand=1-smooth(1.61,1.76,p.z)
        shoulder=smooth(.29,.61,abs(p.x))
        return {'Chest':1-shoulder,'UpperArm.'+suffix:shoulder*(1-lower),
                'LowerArm.'+suffix:shoulder*lower*(1-hand),'Hand.'+suffix:shoulder*lower*hand}
    return weight


def leg_weight(sign):
    suffix='L' if sign>0 else 'R'
    def weight(p):
        upper=smooth(.89,1.12,p.z)
        pelvis=smooth(1.46,1.65,p.z)
        return {'UpperLeg.'+suffix:upper*(1-pelvis),
                'LowerLeg.'+suffix:(1-upper)*(1-pelvis),'Pelvis':pelvis}
    return weight


def skeleton(collection):
    BONES.update({
        'Root':((0,0,0),(0,0,.25),None),
        'Pelvis':((0,0,1.43),(0,0,1.77),'Root'),
        'Chest':((0,0,1.77),(0,0,2.40),'Pelvis'),
        'Neck':((0,0,2.40),(0,0,2.69),'Chest'),
        'Head':((0,0,2.69),(0,0,3.58),'Neck'),
    })
    for sign,s in [(1,'L'),(-1,'R')]:
        BONES.update({
            'UpperArm.'+s:((sign*.43,0,2.34),(sign*.70,0,1.99),'Chest'),
            'LowerArm.'+s:((sign*.70,0,1.99),(sign*.85,-.015,1.69),'UpperArm.'+s),
            'Hand.'+s:((sign*.85,-.015,1.69),(sign*.90,-.025,1.49),'LowerArm.'+s),
            'UpperLeg.'+s:((sign*.225,0,1.49),(sign*.235,-.018,1.00),'Pelvis'),
            'LowerLeg.'+s:((sign*.235,-.018,1.00),(sign*.24,0,.39),'UpperLeg.'+s),
            'Foot.'+s:((sign*.24,0,.39),(sign*.24,-.29,.14),'LowerLeg.'+s),
        })
    for name,(head,tail,parent) in list(BONES.items()):
        BONES[name]=(proportion(head),proportion(tail),parent)
    data=bpy.data.armatures.new('SquishySkeleton')
    rig=bpy.data.objects.new('SquishyRig',data)
    collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for name,(head,tail,parent) in BONES.items():
        bone=data.edit_bones.new(name); bone.head=head; bone.tail=tail
        if parent: bone.parent=data.edit_bones[parent]
        bone.use_connect=bool(parent and (Vector(head)-data.edit_bones[parent].tail).length<1e-5)
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.show_in_front=True
    data.display_type='OCTAHEDRAL'
    rig['skeletonId']='squishy-humanoid-palm-v2'
    rig['restPose']='relaxed-A'
    rig['units']='meters'
    return rig


def build_character(rig,collection):
    skin=MeshBuilder('Body','body')
    skin.ellipsoid((0,0,1.87),(.355,.22,.51),'Skin',torso_weight)
    skin.ellipsoid((0,0,1.50),(.32,.205,.24),'Skin','Pelvis')
    skin.tube([(0,0,z) for z in [2.26,2.34,2.44,2.53,2.64,2.72]],
              [.155,.15,.135,.13,.145,.17],'Skin',
              lambda p:{'Chest':1-smooth(2.31,2.45,p.z),'Neck':smooth(2.31,2.45,p.z)*(1-smooth(2.59,2.73,p.z)),
                        'Head':smooth(2.31,2.45,p.z)*smooth(2.59,2.73,p.z)})
    for sign,s in [(1,'L'),(-1,'R')]:
        skin.tube([(sign*x,0,z) for x,z in [(.37,2.33),(.48,2.27),(.60,2.15),(.70,1.99),(.77,1.84),(.85,1.69)]],
                  [.105,.108,.112,.12,.12,.112],'Skin',arm_weight(sign))
        skin.ellipsoid((sign*.883,-.018,1.575),(.123,.116,.145),'Skin','Hand.'+s,20,12)
        skin.ellipsoid((sign*.795,-.058,1.603),(.055,.061,.087),'Skin','Hand.'+s,16,10)
        skin.tube([(sign*.235,0,z) for z in [1.58,1.48,1.27,1.10,1,.84,.64,.39]],
                  [.14,.145,.137,.118,.12,.112,.10,.085],'Skin',leg_weight(sign))
        skin.ellipsoid((sign*.24,-.10,.205),(.11,.22,.14),'Skin','Foot.'+s,20,12)
    skin.finish(rig,collection)
    head=MeshBuilder('Head','head')
    def face_shape(p,phi,theta):
        # Full cheeks and a softly flattened front plane match a palm doll.
        t=p.z/.495
        taper=1-.025*max(0,-t)**1.6
        p.x*=taper
        if p.y<0:
            p.y*=.925
            p.z-=.012*(1-t*t)
        return p
    head.ellipsoid((0,0,HEAD_CENTER),(.452,.352,.485),'Skin','Head',40,28,face_shape)
    for sign in [-1,1]:
        head.ellipsoid((sign*.429,.007,3.08),(.085,.073,.118),'Skin','Head',20,12)
        head.ellipsoid((sign*.467,-.052,3.081),(.035,.014,.066),'EarBlush','Head',16,10)
    # The nose is only a tiny silicone rise.
    head.ellipsoid((0,-.329,3.070),(.016,.014,.012),'Skin','Head',16,10)
    head.finish(rig,collection)

    eyes=MeshBuilder('Eyes','eyes')
    brows=MeshBuilder('Eyebrows','eyebrows')
    face=MeshBuilder('FaceDetails','face-details')
    for sign in [-1,1]:
        x=sign*.133
        # Pure black vertical bean eyes, with no sclera or realistic iris.
        eyes.ellipsoid((x,-.332,3.145),(.027,.017,.060),'Eyes','Head',24,16)
        brows.curve([(x-.050,-.319,3.252),(x-.018,-.337,3.254),(x+.018,-.337,3.253),(x+.050,-.321,3.249)],
                    .010,'Hair','Head',16,8,True)
    face.curve([(-.038,-.330,3.010),(-.016,-.341,3.008),(.016,-.341,3.008),(.038,-.330,3.010)],
               .007,'Mouth','Head',14,8,True)
    eyes.finish(rig,collection); brows.finish(rig,collection); face.finish(rig,collection)

    hair=MeshBuilder('Hair_Comma','hair')
    # Closed scalp cap with a variable hairline and quad strips.
    seg=40; rings=15
    top=hair.vert((0,.02,3.735),'Head'); rows=[]
    for j in range(1,rings+1):
        row=[]
        for i in range(seg):
            theta=i*2*math.pi/seg
            front=max(0,-math.sin(theta))
            maxphi=1.82-.46*front**2
            phi=maxphi*j/rings
            p=(.467*math.sin(phi)*math.cos(theta),.02+.384*math.sin(phi)*math.sin(theta),
               3.20+.535*math.cos(phi))
            row.append(hair.vert(p,'Head'))
        rows.append(row)
    bottom=hair.vert((0,.05,3.16),'Head')
    for i in range(seg):
        k=(i+1)%seg
        hair.face((top,rows[0][i],rows[0][k]),'Hair')
        for a,b in zip(rows,rows[1:]): hair.face((a[i],b[i],b[k],a[k]),'Hair')
        hair.face((bottom,rows[-1][k],rows[-1][i]),'Hair')
    # A soft scalloped fringe made from broad, rounded locks.
    locks=[
        ([(-.31,-.12,3.56),(-.34,-.28,3.53),(-.34,-.385,3.39),(-.31,-.350,3.31)],.057),
        ([(-.23,-.16,3.60),(-.25,-.31,3.56),(-.24,-.407,3.41),(-.20,-.365,3.28)],.063),
        ([(-.13,-.19,3.62),(-.15,-.34,3.57),(-.13,-.421,3.40),(-.10,-.378,3.27)],.065),
        ([(0,-.20,3.63),(0,-.36,3.57),(0,-.430,3.40),(0,-.384,3.26)],.068),
        ([(.13,-.19,3.62),(.15,-.34,3.57),(.13,-.421,3.40),(.10,-.378,3.27)],.065),
        ([(.23,-.16,3.60),(.25,-.31,3.56),(.24,-.407,3.41),(.20,-.365,3.28)],.063),
        ([(.31,-.12,3.56),(.34,-.28,3.53),(.34,-.385,3.39),(.31,-.350,3.31)],.057),
    ]
    for points,radius in locks:
        hair.curve(points,radius,'Hair','Head',24,14,True,depth_ratio=.54)
    for sign in [-1,1]:
        hair.curve([(sign*.40,.005,3.47),(sign*.46,-.04,3.34),(sign*.44,-.09,3.20),(sign*.409,-.074,3.16)],
                   .053,'Hair','Head',14,10,True)
    hair.finish(rig,collection)

    shirt=MeshBuilder('Top_BlackTshirt','tops')
    # Rounded box-like torso, quiet shoulder slope and elbow-length loose sleeves.
    shirt.tube([(0,0,z) for z in [1.43,1.47,1.53,1.72,1.92,2.12,2.28,2.37,2.43,2.49]],
               [.33,.398,.429,.449,.45,.445,.416,.33,.22,.155],
               'Tshirt',torso_weight,36,[.22,.263,.283,.292,.289,.274,.249,.22,.18,.138])
    for sign in [-1,1]:
        shirt.ellipsoid((sign*.425,0,2.27),(.16,.194,.15),'Tshirt',arm_weight(sign),28,18)
        shirt.tube([(sign*x,0,z) for x,z in [(.32,2.32),(.43,2.30),(.52,2.23),(.61,2.12),(.70,1.98),(.73,1.91)]],
                   [.14,.175,.19,.194,.181,.166],'Tshirt',arm_weight(sign),28)
    shirt.finish(rig,collection)

    pants=MeshBuilder('Bottom_WidePants','bottoms')
    pants.ellipsoid((0,.014,1.465),(.335,.229,.25),'Pants','Pelvis',28,16)
    for sign,s in [(1,'L'),(-1,'R')]:
        pants.tube([(sign*x,.012,z) for x,z in [(.19,1.56),(.218,1.47),(.23,1.32),(.237,1.15),(.239,1.0),(.24,.83),(.24,.55),(.24,.405),(.24,.375)]],
                   [.186,.195,.192,.183,.177,.178,.18,.178,.166],'Pants',leg_weight(sign),24,
                   [.212,.215,.21,.198,.193,.19,.19,.185,.177])
    pants.finish(rig,collection)
    socks=MeshBuilder('Socks','socks')
    shoes=MeshBuilder('Shoes_Chunky','shoes')
    for sign,s in [(1,'L'),(-1,'R')]:
        x=sign*.24; foot='Foot.'+s
        socks.tube([(x,0,z) for z in [.29,.36,.46,.56,.59]], [.11,.11,.113,.114,.107],
                   'Socks','LowerLeg.'+s,20)
        def sole_shape(p,phi,theta):
            # Superellipsoid-like sole with a planar stance and rounded edges.
            for k in [0,1,2]:
                r=[.191,.325,.08][k]
                n=p[k]/r
                p[k]=r*math.copysign(abs(n)**.52,n)
            return p
        shoes.ellipsoid((x,-.102,.105),(.191,.325,.08),'Sole',foot,28,16,sole_shape)
        shoes.ellipsoid((x,-.09,.24),(.18,.297,.149),'Shoes',foot,28,16)
        shoes.ellipsoid((x,-.024,.315),(.102,.165,.062),'Shoes',foot,20,12)
        for j in range(2):
            y=-.16+j*.048; z=.393-j*.003
            shoes.curve([(x-.069,y,z-.009),(x-.033,y-.012,z+.009),(x+.033,y+.012,z+.009),(x+.069,y,z-.009)],
                        .009,'Socks',foot,10,6)
    socks.finish(rig,collection); shoes.finish(rig,collection)


def build_glasses(rig,collection):
    glasses=MeshBuilder('Glasses_SoftSquare','glasses')
    for sign in [-1,1]:
        cx=sign*.168
        pts=[]
        for i in range(49):
            t=i*2*math.pi/48
            def s(v): return math.copysign(abs(v)**.62,v)
            pts.append((cx+.122*s(math.cos(t)),-.369+.015*abs(math.cos(t)),3.166+.086*s(math.sin(t))))
        glasses.tube(pts,[.010]*len(pts),'Glasses','Head',8)
        glasses.curve([(sign*.29,-.36,3.18),(sign*.38,-.33,3.20),(sign*.44,-.13,3.17),(sign*.455,.025,3.14)],
                      .009,'Glasses','Head',20,8)
    glasses.curve([(-.047,-.366,3.184),(-.02,-.382,3.211),(.02,-.382,3.211),(.047,-.366,3.184)],
                  .009,'Glasses','Head',16,8)
    return glasses.finish(rig,collection)


def look_at(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


def studio():
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.render.threads_mode='FIXED'
    scene.render.threads=8
    scene.cycles.samples=32
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1000; scene.render.resolution_y=1200
    scene.render.resolution_percentage=100
    scene.world.color=(.24,.24,.24)
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.57,.61,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.38
    scene.view_settings.view_transform='AgX'
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.023))
    floor=bpy.context.object; floor.name='STUDIO_Floor'
    floor.data.materials.append(make_material('StudioPaper',('E9E6E1',.93,0)))
    for name,loc,power,size,color in [
        ('Key',(-3,-4,7),520,4.0,(1,.91,.83)),
        ('Fill',(4,-2,4),330,3.5,(.84,.91,1)),
        ('Rim',(1,3,6),650,3.0,(1,.95,.88)),
    ]:
        bpy.ops.object.light_add(type='AREA',location=loc)
        lamp=bpy.context.object; lamp.name='STUDIO_'+name
        lamp.data.energy=power; lamp.data.shape='DISK'; lamp.data.size=size; lamp.data.color=color
        look_at(lamp,(0,0,1.9))
    bpy.ops.object.camera_add(location=(3.2,-9,3.2))
    camera=bpy.context.object; camera.name='STUDIO_Camera'
    camera.data.type='ORTHO'; camera.data.ortho_scale=3.30
    look_at(camera,(0,0,1.40)); scene.camera=camera
    return camera


def export_glb(path,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    # Identity-transform skinned meshes can be exported as scene roots; their
    # Armature modifiers still reference the shared rig. Avoid ambiguous parent transforms.
    parents={obj:obj.parent for obj in objects if obj.type=='MESH'}
    try:
        for obj in parents:obj.parent=None
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
            export_skins=True,export_morph=True,export_morph_normal=True,
            export_animations=False,export_apply=False,export_extras=True,
            export_yup=True,export_texcoords=False,export_normals=True,
            export_materials='EXPORT',export_cameras=False,export_lights=False)
    finally:
        for obj,parent in parents.items():obj.parent=parent



def contract(rig,objects,out):
    def web(p): return [p[0],p[2],-p[1]]
    bones=[]
    for name,(head,tail,parent) in BONES.items():
        bone=rig.data.bones[name]
        item={'name':name,'parent':parent,'headBlender':list(head),'tailBlender':list(tail),
              'headWeb':web(head),'tailWeb':web(tail),
              'restMatrixBlender':[list(row) for row in bone.matrix_local]}
        if name != 'Root':
            radius=.10
            if name=='Head':radius=.43
            elif name in ('Chest','Pelvis'):radius=.22
            elif 'Arm' in name:radius=.12
            elif 'Leg' in name:radius=.14
            item['suggestedCollider']={'type':'capsule','radius':radius,
                'centerWeb':web((Vector(head)+Vector(tail))*.5),
                'axisWeb':web((Vector(tail)-Vector(head)).normalized()),
                'halfHeight':max(.015,(Vector(tail)-Vector(head)).length*.5-radius),
                'note':'Initial fitting hint only; refit for clothing, morphs and final runtime scale.'}
            if parent and parent!='Root':
                anchor=Vector(head)
                item['jointAnchorChildLocal']=list(bone.matrix_local.inverted()@anchor)
                item['jointAnchorParentLocal']=list(rig.data.bones[parent].matrix_local.inverted()@anchor)
        bones.append(item)
    data={'schema':'squishy-asset-v1','skeletonId':'squishy-humanoid-palm-v2',
          'authoringAxes':'Blender Z-up, front -Y, anatomical left +X',
          'exportAxes':'glTF Y-up, front +Z, anatomical left +X',
          'unit':'meter','heightApprox':2.66,'headHeight':.99,'headRatioApprox':2.69,
          'morphNames':MORPHS,'morphRange':[0,1],
          'morphPolicy':'Synchronize matching targets on ALL active meshes. Test combinations; do not max every target together.',
          'physicsPolicy':'No baked physics. Drive pose bones with runtime rigid bodies. Global morphs move geometry away from rest joints; refit colliders/anchors or separate whole-body morph mode from ragdoll mode.',
          'replacementPolicy':'Variants must share rig rest matrices, identity mesh transforms, weights, and the same deformation field. Rebind loaded variant to the active skeleton; do not retain a second animated skeleton.',
          'optionalGlasses':'glasses_soft_square.glb (not included in default visible character)',
          'bones':bones,'meshes':[{'name':o.name,'slot':o['slot'],'vertices':len(o.data.vertices),
                                   'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)} for o in objects]}
    (out/'asset_contract.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))


def main():
    global DESIGN_PREVIEW_ONLY
    script_path=Path(globals().get('__file__','generate_squishy.py'))
    embedded=bpy.data.texts.get('generate_squishy.py')
    source_text=script_path.read_text() if script_path.is_file() else (embedded.as_string() if embedded else '')
    default_dir=script_path.resolve().parent if script_path.is_file() else (Path(bpy.data.filepath).parent if bpy.data.filepath else Path.cwd()/'squishy-output')
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',type=Path,default=default_dir)
    parser.add_argument('--skip-render',action='store_true')
    parser.add_argument('--preview-only',action='store_true')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    DESIGN_PREVIEW_ONLY=args.preview_only
    out=args.output_dir.resolve(); out.mkdir(parents=True,exist_ok=True)
    # Intentionally reset this Blender scene. Run in a new/background Blender session.
    bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode!='OBJECT' else None
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name.startswith(('CHARACTER','OPTIONAL_VARIANTS')):
            bpy.data.collections.remove(collection)
    for storage in (bpy.data.meshes,bpy.data.armatures,bpy.data.materials,bpy.data.curves):
        for datablock in list(storage):
            if datablock.users==0:storage.remove(datablock)
    PARTS.clear(); BONES.clear(); MATERIALS.clear()
    bpy.context.scene.unit_settings.system='METRIC'
    bpy.context.scene.unit_settings.scale_length=1
    for name,spec in PALETTE.items():MATERIALS[name]=make_material(name,spec)
    collection=bpy.data.collections.new('CHARACTER'); bpy.context.scene.collection.children.link(collection)
    optional=bpy.data.collections.new('OPTIONAL_VARIANTS'); bpy.context.scene.collection.children.link(optional)
    rig=skeleton(collection)
    build_character(rig,collection)
    base=list(PARTS)
    camera=studio()
    bpy.context.scene.render.image_settings.file_format='PNG'
    bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True)
    bpy.context.view_layer.objects.active=rig
    if args.preview_only:
        bpy.context.scene.render.filepath=str(out/'preview.png')
        bpy.ops.render.render(write_still=True)
        print('SQUISHY_BASIS_PREVIEW_COMPLETE',out/'preview.png')
        return
    glasses=build_glasses(rig,optional)
    export_glb(out/'squishy_base.glb',[rig,*base])
    export_glb(out/'glasses_soft_square.glb',[rig,glasses])
    glasses.hide_render=True; glasses.hide_set(True)
    contract(rig,base,out)
    script_text=bpy.data.texts.get('generate_squishy.py') or bpy.data.texts.new('generate_squishy.py')
    script_text.clear(); script_text.write(source_text)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'squishy_base.blend'))
    if not args.skip_render:
        bpy.context.scene.render.filepath=str(out/'preview.png'); bpy.ops.render.render(write_still=True)
        camera.location=(0,-9,2.5); look_at(camera,(0,0,1.40))
        bpy.context.scene.render.filepath=str(out/'front.png'); bpy.ops.render.render(write_still=True)
        camera.location=(4,8,3.2); look_at(camera,(0,0,1.40))
        bpy.context.scene.render.filepath=str(out/'back.png'); bpy.ops.render.render(write_still=True)
    print('SQUISHY_GENERATION_COMPLETE',out)


if __name__=='__main__':
    main()
