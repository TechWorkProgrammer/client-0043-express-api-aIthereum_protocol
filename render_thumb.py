import bpy, sys, mathutils

glb_path, out_path = sys.argv[-2], sys.argv[-1]

bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.gltf(filepath=glb_path)
meshes = [o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:
    sys.exit("No mesh found")

obj = meshes[0]
obj.location = (0,0,0)
bpy.context.view_layer.update()

cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
bpy.context.collection.objects.link(cam)
cam.location = (2, 2, 2)
ctr = cam.constraints.new(type='TRACK_TO')
ctr.target = obj
ctr.track_axis = 'TRACK_NEGATIVE_Z'
ctr.up_axis    = 'UP_Y'
bpy.context.scene.camera = cam

def make_light(name, loc, energy):
    ld = bpy.data.lights.new(name, type='AREA')
    lo = bpy.data.objects.new(name+"Obj", ld)
    bpy.context.collection.objects.link(lo)
    lo.location = loc
    ld.energy   = energy

make_light("KeyLight",  (4, 4, 4), 1000)
make_light("FillLight", (-4,-4, 2),  300)

scene = bpy.context.scene
scene.render.engine        = 'BLENDER_EEVEE_NEXT'
scene.render.film_transparent = True
scene.render.resolution_x  = 512
scene.render.resolution_y  = 512
scene.render.filepath       = out_path

bpy.ops.render.render(write_still=True)
