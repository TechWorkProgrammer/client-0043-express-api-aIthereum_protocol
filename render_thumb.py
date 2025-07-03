import bpy, sys

glb_path, out_path = sys.argv[-2], sys.argv[-1]

bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.gltf(filepath=glb_path)

cam_data = bpy.data.cameras.new("Cam")
cam_obj  = bpy.data.objects.new("CamObj", cam_data)
bpy.context.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj
cam_obj.location = (2, 2, 2)
cam_obj.rotation_euler = (0.7, 0.0, 0.7)

light_data = bpy.data.lights.new("Light", type='AREA')
light_obj  = bpy.data.objects.new("LightObj", light_data)
bpy.context.collection.objects.link(light_obj)
light_obj.location = (5, 5, 5)
light_data.energy = 1000

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.filepath = out_path

bpy.ops.render.render(write_still=True)
