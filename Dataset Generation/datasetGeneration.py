import audioToTensor
import midiToTensor
import tensorflow as tf
import numpy as np
import os


def build_tensors(wav, midi, bpm):
    midi_list = midiToTensor.create_midi_tensors(midi)
    amplitudes_list = audioToTensor.create_amplitude_tensors(wav, bpm)
    if len(midi_list) > len(amplitudes_list):
        print("Error: amplitude list smaller than midi list for unknown reason, aborting...")
        return []
    
    master_list = []
    for i in range(len(midi_list)):
        audio_slice = amplitudes_list[i:i+8] # input size 128 x 8, covers one quarter note
        midi_slice = midi_list[i:i+8]
        # midi_slice = midi_list
        master_list.append([audio_slice, midi_slice])
    
    # returns array of this structure:
    # index 0: 128x8 array representing 8 64th-note slices of the spectrogram (consider changing to 32nds)
    # index 1: 48x4 array representing one-hot encoded array of MIDI note beginnings.
    return master_list

# Boilerplate code for TFRecord usage
def _bytes_feature(value):
    return tf.train.Feature(bytes_list=tf.train.BytesList(value=[value]))

def serialize_array(array):
    return tf.io.serialize_tensor(array).numpy()

def image_pair_to_example(image_pair):
    input_image, output_image = image_pair
    feature = {
        'input_image': _bytes_feature(serialize_array(input_image)),
        'output_image': _bytes_feature(serialize_array(output_image))
    }
    return tf.train.Example(features=tf.train.Features(feature=feature))

def write_tfrecord_file(filename, image_pairs):
    with tf.io.TFRecordWriter(filename) as writer:
        for image_pair in image_pairs:
            tf_example = image_pair_to_example(image_pair)
            writer.write(tf_example.SerializeToString())

# create the data and save to a TFRecord file
image_pairs = build_tensors("/Users/ryanmccormick/Downloads/Code/TF FIles for Chatgpt/advancedWAVs/melodic-test_midi--StrixGuitarPack-5.wav", "/Users/ryanmccormick/Downloads/Code/TF FIles for Chatgpt/advancedMIDIs/melodic-test_midi.mid", 120)

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
data_path = os.path.join(parent_dir, 'data.tfrecord')

write_tfrecord_file(data_path, image_pairs)
