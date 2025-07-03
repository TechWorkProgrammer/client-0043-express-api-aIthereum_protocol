import bpy, sys, mathutils

glb_path, out_path = sys.argv[-2], sys.argv[-1]

bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.gltf(filepath=glb_path)
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']

for o in objs:
    o.location = (0,0,0)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

cam_data = bpy.data.cameras.new("Cam")
cam_obj  = bpy.data.objects.new("CamObj", cam_data)
bpy.context.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

cam_obj.location = (2, 2, 2)
cam_obj.rotation_euler = (0.785, 0, 0.785)

lamp_data = bpy.data.lights.new("KeyLight", type='AREA')
lamp = bpy.data.objects.new("KeyLightObj", lamp_data)
bpy.context.collection.objects.link(lamp)
lamp.location = (4, 4, 4)
lamp_data.energy = 1000

fill_data = bpy.data.lights.new("FillLight", type='AREA')
fill = bpy.data.objects.new("FillLightObj", fill_data)
bpy.context.collection.objects.link(fill)
fill.location = (-4, -4, 2)
fill_data.energy = 300

world = bpy.context.scene.world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.8, 0.8, 0.8, 1)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
