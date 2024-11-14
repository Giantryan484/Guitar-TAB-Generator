import subprocess
import os


def convert(midi_file_path, soundfont_path, output_wav_path):
    # Paths
    # midi_file_path = 'advancedMIDIs/'+filename+'.mid'
    # # soundfont_path = 'FluidR3_GM.sf2'
    # output_wav_path = 'advancedWAVs/'+filename+'.wav'

    # FluidSynth command
    command = [
        "fluidsynth",
        "-ni",
        soundfont_path,
        midi_file_path,
        "-F",
        output_wav_path,
        "-r",
        "44100",
    ]

    # Run the FluidSynth command
    result = subprocess.run(command, capture_output=True, text=True)

    # Check result
    if result.returncode == 0:
        print("MIDI has been successfully converted to WAV.")
    else:
        print("Error converting MIDI to WAV:")
        print(result.stderr)
        
# convert("/Users/ryanmccormick/Downloads/Code/TF FIles for Chatgpt/advancedMIDIs/chords-2_test_midi.mid", "Python/MIDI and Wav Handling/Guitars-Universal-V1.5.sf2", "test.wav")
# convert("Python/Data/MIDIs/000001.mid", "Python/MIDI and Wav Handling/Guitars-Universal-V1.5.sf2", "Python/Data/WAVs/000001.wav")
