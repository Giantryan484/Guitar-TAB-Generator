import matplotlib.pyplot as plt
import tensorflow as tf
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "model.keras")
parent_dir = os.path.dirname(current_dir)
data_path = os.path.join(parent_dir, "Data")
dataset_path = os.path.join(data_path, "dataset.tfrecord")

def parse_tfrecord_fn(example):
    feature_description = {
        'input_image': tf.io.FixedLenFeature([], tf.string),
        'output_image': tf.io.FixedLenFeature([], tf.string),
    }
    example = tf.io.parse_single_example(example, feature_description)
    
    # Parse the serialized tensor and cast to float32
    input_image = tf.io.parse_tensor(example['input_image'], out_type=tf.float32)
    output_image = tf.io.parse_tensor(example['output_image'], out_type=tf.float32)
    
    # Check the raw shapes before reshaping
    # print(f"Raw input shape: {input_image.shape}")
    # print(f"Raw output shape: {output_image.shape}")
    
    # # Reshape the tensors to their expected shapes
    # input_image = tf.reshape(input_image, [32, 128])  # Shape: (32, 128)
    # output_image = tf.reshape(output_image, [32, 49])  # Shape: (32, 49)

    # Add a channel dimension to the input for compatibility with the CNN
    input_image = tf.expand_dims(input_image, -1)  # Shape: (32, 128, 1)

    return input_image, output_image


def load_dataset(tfrecord_path, batch_size):
    dataset = tf.data.TFRecordDataset(tfrecord_path)
    dataset = dataset.map(parse_tfrecord_fn)
    
    dataset = dataset.shuffle(1000)
    dataset = dataset.batch(batch_size)
    dataset = dataset.prefetch(tf.data.experimental.AUTOTUNE)
    
    return dataset

# load the dataset
batch_size = 32
dataset = load_dataset(dataset_path, batch_size)

model = tf.keras.models.load_model(model_path)

# Visualize random dataset item:
for spectrogram_batch, midi_batch in dataset.take(1):  # Unpack input and output, only use input here
    # spectrogram_batch has shape (batch_size, 32, 128, 1)
    spectrogram_data = spectrogram_batch[0].numpy()  # Take the first example in the batch

    # Remove the channel dimension (32, 128, 1) -> (32, 128)
    spectrogram = spectrogram_data.squeeze()
    
    print(spectrogram.shape)

    # Display the 32x128 spectrogram image
    plt.figure(figsize=(10, 10))
    plt.imshow(spectrogram, aspect='auto', cmap='viridis', origin='lower')
    plt.colorbar(label='Amplitude (0 to 1)')
    plt.title("Spectrogram (32 time steps, 128 frequency bins)")
    plt.ylabel("Time Steps (32)")
    plt.xlabel("Frequency Bins (128)")
    plt.show()
    
    
    # MIDI output
    midi = midi_batch[0].numpy()

    # Remove the extra batch dimension
    midi = midi.squeeze()
    
    plt.figure(figsize=(10, 10))
    plt.imshow(midi, aspect='auto', cmap='viridis', origin='lower')
    plt.colorbar(label='Amplitude (0 to 1)')
    plt.title("MIDI (32 time steps, 49 MIDI Notes)")
    plt.ylabel("Time Steps (32)")
    plt.xlabel("MIDI Notes (49)")
    plt.show()
    
    # midi = model.predict(spectrogram_data)
    
    # Predict MIDI output
    midi_prediction = model.predict(spectrogram_batch)  # Shape: (1, 32, 49)

    # Remove the extra batch dimension
    midi_prediction = midi_prediction[0]  # Shape becomes (32, 49)
    
    plt.figure(figsize=(10, 10))
    plt.imshow(midi_prediction, aspect='auto', cmap='viridis', origin='lower')
    plt.colorbar(label='Amplitude (0 to 1)')
    plt.title("MIDI (32 time steps, 49 MIDI Notes)")
    plt.ylabel("Time Steps (32)")
    plt.xlabel("MIDI Notes (49)")
    plt.show()


