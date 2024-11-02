# This file was my first attempt at visualizing notes in the generated MIDI. It's not used in the final product anywhere.

import mido
import numpy as np
import matplotlib.pyplot as plt

def load_midi(file_path):
    midi_file = mido.MidiFile(file_path)
    messages_with_time = []

    current_time = 0

    for message in midi_file:
        current_time += message.time
        messages_with_time.append((current_time, message))

    return messages_with_time 

def get_note_periods(messages_with_time):
    note_periods = []  
    notes_on = {} 

    for time, message in messages_with_time:
        if message.type == 'note_on' and message.velocity > 0: 
            if message.note not in notes_on:
                notes_on[message.note] = [] 
            notes_on[message.note].append(time) 
        elif message.type == 'note_off' or (message.type == 'note_on' and message.velocity == 0):
            if message.note in notes_on and notes_on[message.note]: 
                start_time = notes_on[message.note].pop() 
                note_periods.append((message.note, start_time, time)) 

    for note, times in notes_on.items():
        for start_time in times:
            note_periods.append((note, start_time, messages_with_time[-1][0]))
    return note_periods

def visualize_midi(file_path):
    messages_with_time = load_midi(file_path)
    note_periods = get_note_periods(messages_with_time)
    fig, ax = plt.subplots()

    for note, start_time, end_time in note_periods:
        ax.plot([start_time, end_time], [note-40, note-40], marker='|')  # Plot each note period as a horizontal line
    
    ax.set_xlabel('Time (seconds)')
    ax.set_ylabel('MIDI Note Number')
    plt.title('MIDI Note Visualization ('+file_path+')') 
    plt.show()

# print("\n".join([str(x) for x in load_midi("advancedMIDIs/melodic-test_midi.mid")]))
visualize_midi("Data/MIDIs/000001.mid")