print(0)

import tensorflow as tf

import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"

print("1")

import tensorflowjs as tfjs
# import tf_keras as keras
import os
print("2")

# tf.print()


# def convert_keras_to_tfjs(keras_model_path, output_dir):
#     model = tf.keras.models.load_model(keras_model_path)

#     converter = tf.lite.TFLiteConverter.from_keras_model(model)
#     converter.optimizations = [tf.lite.Optimize.DEFAULT]
#     converter.target_spec.supported_types = [tf.float16]
#     converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS, tf.lite.OpsSet.SELECT_TF_OPS]
#     converter._experimental_lower_tensor_list_ops = False
#     converter.experimental_enable_resource_variables = True

#     tflite_quantized_model = converter.convert()

#     if not os.path.exists(output_dir):
#         os.makedirs(output_dir)
#     tfjs.converters.save_keras_model(model, output_dir)

def convert_keras_to_tfjs(keras_model_path, output_dir):
    # Load the Keras model
    # model = keras.models.load_model(keras_model_path)
    model = tf.keras.models.load_model(keras_model_path)

    # Ensure the output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Convert and save the model in TensorFlow.js format
    tfjs.converters.save_keras_model(model, output_dir)
    # tfjs.converters.convert_tf_saved_model()

current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "best_model.keras")

# model = tf.keras.models.load_model(model_path)
# model.save("Model Training/model.h5")

parent_dir = os.path.dirname(current_dir)
app_path = os.path.join(parent_dir, "tab-generator-app")
public_path = os.path.join(app_path, "public")
# output_path = os.path.join(public_path, "tf_model")
# print("done")
convert_keras_to_tfjs(model_path, public_path)

# tensorflowjs_converter --input_format keras \
#                        "Model Training/model.h5" \
#                        "tab-generator-app/public/tf_model"

