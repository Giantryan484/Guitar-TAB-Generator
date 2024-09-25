import tensorflow as tf
import os
import matplotlib.pyplot as plt

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
    input_image = tf.reshape(input_image, [32, 128])  # Shape: (32, 128)
    output_image = tf.reshape(output_image, [32, 49])  # Shape: (32, 49)

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

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
data_path = os.path.join(parent_dir, "Data")
dataset_path = os.path.join(data_path, "dataset.tfrecord")

# load the dataset
batch_size = 32
dataset = load_dataset(dataset_path, batch_size)
# dataset = dataset.batch(batch_size)

# Visualize random dataset item:
# for spectrogram_batch, midi_batch in dataset.take(1):  # Unpack input and output, only use input here
#     # spectrogram_batch has shape (batch_size, 32, 128, 1)
#     spectrogram = spectrogram_batch[0].numpy()  # Take the first example in the batch

#     # Remove the channel dimension (32, 128, 1) -> (32, 128)
#     spectrogram = spectrogram.squeeze()
    
#     print(spectrogram.shape)

#     # Display the 32x128 spectrogram image
#     plt.figure(figsize=(10*(32/128), 10))
#     plt.imshow(spectrogram, aspect='auto', cmap='viridis', origin='lower')
#     plt.colorbar(label='Amplitude (0 to 1)')
#     plt.title("Spectrogram (32 time steps, 128 frequency bins)")
#     plt.xlabel("Time Steps (32)")
#     plt.ylabel("Frequency Bins (128)")
#     plt.show()
    
#     midi = midi_batch[0].numpy()
#     midi = midi.squeeze()
    
#     print(midi.shape)
    
#     plt.figure(figsize=(10*(32/49), 10))
#     plt.imshow(midi, aspect='auto', cmap='viridis', origin='lower')
#     plt.colorbar(label='Amplitude (0 to 1)')
#     plt.title("MIDI (32 time steps, 49 MIDI Notes)")
#     plt.ylabel("Time Steps (32)")
#     plt.xlabel("MIDI Notes (49)")
#     plt.show()

# Model Structure:
input_layer = tf.keras.layers.Input(shape=(32, 128, 1))  # 32 time steps, 128 frequency bins, 1 channel

cnn = tf.keras.layers.Conv2D(32, (3, 3), activation='relu', padding='same')(input_layer)  # (None, 32, 128, 32)
cnn = tf.keras.layers.MaxPooling2D(pool_size=(2, 2))(cnn)  # (None, 16, 64, 32)
cnn = tf.keras.layers.Conv2D(64, (3, 3), activation='relu', padding='same')(cnn)  # (None, 16, 64, 64)
cnn = tf.keras.layers.MaxPooling2D(pool_size=(2, 2))(cnn)  # (None, 8, 32, 64)
cnn_flattened = tf.keras.layers.Reshape((32, -1))(cnn)  # Flatten but maintain 32 time steps, shape becomes (None, 32, 2048)

gru = tf.keras.layers.GRU(128, return_sequences=True)(cnn_flattened)  # Output shape: (None, 32, 128)
output_layer = tf.keras.layers.TimeDistributed(tf.keras.layers.Dense(49, activation='softmax'))(gru)  # (None, 32, 49)

model = tf.keras.Model(inputs=input_layer, outputs=output_layer)
model.compile(optimizer='adam', loss='categorical_crossentropy') # Output is onehot encoded classifications, so categorical crossentropy is most appropriate, or so I think


# print(model.summary())
# for spectrogram_batch, labels_batch in dataset.take(1):
#     print(f"Input batch shape: {spectrogram_batch.shape}")
#     print(f"Label batch shape: {labels_batch.shape}")

# Training parameters
epochs = 50  # Number of epochs to train the model
# steps_per_epoch = 80  # Number of batches per epoch (you can adjust this based on your dataset size)

# print(sum(1 for _ in tf.data.TFRecordDataset(dataset_path)))

# Train the model
history = model.fit(dataset, epochs=epochs)

model.save(os.path.join(current_dir, "model.keras"))