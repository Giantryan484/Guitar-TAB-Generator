import midiGenterator
import midiToWav
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
data_path = os.path.join(parent_dir, "Data")
midi_path = os.path.join(data_path, "MIDIs")
wav_path = os.path.join(data_path, "WAVs")

NUM_WAV_MIDI_PAIRS = 50
SOUNDFONT_PATH = os.path.join(current_dir, "Guitars-Universal-V1-5.sf2")

for i in range(1, NUM_WAV_MIDI_PAIRS + 1):
    midi_file = os.path.join(midi_path, str(i).zfill(6) + ".mid")
    wav_file = os.path.join(wav_path, str(i).zfill(6) + ".wav")
    midiGenterator.generate_random(midi_file)
    midiToWav.convert(midi_file, SOUNDFONT_PATH, wav_file)
