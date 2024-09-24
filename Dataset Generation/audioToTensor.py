import numpy as np
import subprocess
from PIL import Image
import json
import os

# uses js libraries for spectrogram generation (because eventually the data input will be made entirely in js)
def create_spectrogram_with_js(wav_file):
    output_json_path = './Data Generation/output_spectrogram.json' 
    # js_script_path = './Data Generation/process_audio.js'
    js_script_path = './Data Generation/tf_audio_processing.js'
    subprocess.run(['node', js_script_path, wav_file, output_json_path], check=True)
    with open(output_json_path, 'r') as json_file:
        spectrogram_data = json.load(json_file)
    os.remove(output_json_path)

    return np.array(spectrogram_data)

def create_amplitude_tensors(wav_file, bpm):
    Sxx_dB = create_spectrogram_with_js(wav_file)

    if Sxx_dB is None:
        print("Error generating spectrogram from JS.")
        return None
    return Sxx_dB
    

    # some basic preprocessing
    # Sxx_dB = Sxx_dB[:, :512]

    # visualize as an image
    # img_array = np.uint8(255 * Sxx_dB)
    # # image = Image.fromarray(img_array.T[::-1][-128:])
    # # image = Image.fromarray(img_array.T[::-1])
    # image = Image.fromarray(img_array)
    # image.save("test_spectrogram.png")

    # # calculate the duration of a 32nd note in seconds
    # beats_per_second = bpm / 60
    # seconds_per_beat = 1 / beats_per_second
    # seconds_per_32nd_note = seconds_per_beat / 8  # 32nd note duration

    # num_slices = img_array.shape[1]  
    # avg_slices = []

    # # iterate over each 32nd note slice
    # for i in range(num_slices):
    #     # Get the slice of the spectrogram for this time period
    #     slice_Sxx_dB = img_array[:, i]

    #     # Calculate the average value of each vertical pixel in this slice
    #     avg_values = np.mean(slice_Sxx_dB, axis=0)
    #     avg_slices.append(avg_values)

    # # convert the list of average slices to a numpy array for further processing
    # avg_slices_array = np.array(avg_slices)

    # return avg_slices_array

create_amplitude_tensors("/Users/ryanmccormick/Downloads/Code/TF FIles for Chatgpt/advancedWAVs/melodic-test_midi--StrixGuitarPack-5.wav", 120)