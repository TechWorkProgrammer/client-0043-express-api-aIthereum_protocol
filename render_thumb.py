import bpy, sys

glb_path, out_path = sys.argv[-2], sys.argv[-1]

bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.gltf(filepath=glb_path)

scene = bpy.context.scene
if scene.world is None:
    new_world = bpy.data.worlds.new("World")
    scene.world = new_world

scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.8, 0.8, 0.8, 1)

cam_data = bpy.data.cameras.new("Cam")
cam_obj  = bpy.data.objects.new("CamObj", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj
cam_obj.location = (2, 2, 2)
cam_obj.rotation_euler = (0.785, 0, 0.785)

key = bpy.data.lights.new("KeyLight", type='AREA')
key_obj = bpy.data.objects.new("KeyLightObj", key)
scene.collection.objects.link(key_obj)
key_obj.location = (4, 4, 4)
key.energy = 1000

fill = bpy.data.lights.new("FillLight", type='AREA')
fill_obj = bpy.data.objects.new("FillLightObj", fill)
scene.collection.objects.link(fill_obj)
fill_obj.location = (-4, -4, 2)
fill.energy = 300

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
