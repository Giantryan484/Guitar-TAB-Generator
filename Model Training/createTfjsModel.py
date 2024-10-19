import tensorflow as tf
import tensorflowjs as tfjs
import os


def convert_keras_to_tfjs(keras_model_path, output_dir):
    model = tf.keras.models.load_model(keras_model_path)

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_types = [tf.float16]
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS, tf.lite.OpsSet.SELECT_TF_OPS]
    converter._experimental_lower_tensor_list_ops = False
    converter.experimental_enable_resource_variables = True

    tflite_quantized_model = converter.convert()

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    tfjs.converters.save_keras_model(model, output_dir)


current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "model.keras")

parent_dir = os.path.dirname(current_dir)
app_path = os.path.join(parent_dir, "tab-generator-app")
public_path = os.path.join(app_path, "public")
output_path = os.path.join(public_path, "tf_model")

convert_keras_to_tfjs(model_path, output_path)
