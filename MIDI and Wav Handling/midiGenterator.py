import random
from music21 import stream, note, clef, midi, instrument

# Global Constants
LOWEST_NOTE = 40  # MIDI number for E2
HIGHEST_NOTE = 88  # MIDI number for E6
NUM_MEASURES = 4
NOTES_PER_MEASURE = 16  # 16 sixteenth-notes per measure
DURATIONS = [0.25, 0.5, 1.0, 2.0, 4.0]  # 16th, 8th, quarter, half, whole


# randomly picks notes to be played; weighted towards mid range
def biased_note_choice(
    probabilities={"low": 0.5, "middle": 0.35, "high": 0.15}
):  # Randomly select note, but certain note ranges are more favored
    ranges = {"low": (40, 60), "middle": (61, 73), "high": (74, 88)}
    selected_range = random.choices(
        list(ranges.keys()), weights=list(probabilities.values()), k=1
    )[0]
    return random.randint(*ranges[selected_range])  # return random note range


# Generates a sequence of random notes, guaranteeing that no more than 5 notes are played at one time and rests may be present.
def generate_random_weighted(filename):
    # local variables, changes based on generation type
    MAX_ACTIVE_NOTES = 5
    NOTE_PROBABILITY = 0.7  # Probability of a note being played instead of a rest

    melody = stream.Part()
    melody.append(clef.TrebleClef())

    # Guitar intrument lines up with Bank 0 preset 24
    gen_inst = instrument.Guitar()
    preset = random.randint(
        0, 70
    )  # change preset to random value so soundfont is randomly selected.
    gen_inst.midiProgram = preset
    melody.insert(0, gen_inst)

    current_time = 0.0
    max_time = NUM_MEASURES * 4.0  # time is measured in quarter note proportions

    active_notes = []  # lets us keep track of num notes active

    while current_time < max_time:
        if random.random() < NOTE_PROBABILITY:  # If we're adding a note (else rest)
            note_duration = random.choice(DURATIONS)  # randomly choose duration
            if (
                current_time + note_duration > max_time
            ):  # if goes past 4-measure length, shorten
                note_duration = max_time - current_time

            midi_note = (
                biased_note_choice()
            )  # returns weighted_random int from low E1 (40) to high E5 (88).
            new_note = note.Note(
                midi=midi_note, quarterLength=note_duration
            )  # creates note object to be added to midi if there's room

            # update active notes for this time slice
            active_notes = [
                (start, end, n) for start, end, n in active_notes if end > current_time
            ]

            if (
                len(active_notes) < MAX_ACTIVE_NOTES
            ):  # If there's less than MAX_ACTIVE_NOTES being played
                melody.insert(current_time, new_note)  # add to melody object
                active_notes.append(
                    (current_time, current_time + note_duration, new_note)
                )  # add to active notes
            else:  # add rest if too many notes
                melody.insert(current_time, note.Rest(quarterLength=0.25))
        else:  # add rest 30% of the time, so there's sometimes 0, 1, 2, 3, 4 notes instead of 5 always.
            melody.insert(current_time, note.Rest(quarterLength=0.25))
        current_time += 0.25  # increment to next 16th time slice, continue loop till we're past the max_time

    save_midi(melody, filename)  # save to file


# melody with up to 2 notes, group notes together (maybe don't jump more than an octave at once, maybe there's something else we should do that I'm missing)
def generate_melody(filename):
    MAX_JUMP = 12  # Max jump between consecutive notes (in semitones)
    NOTE_PROBABILITY = 0.8  # Probability of a note being played instead of a rest
    MAX_ACTIVE_NOTES = 2  # no more than 2 notes playing at once

    melody = stream.Part()
    melody.append(clef.TrebleClef())

    gen_inst = instrument.Guitar()
    preset = random.randint(
        0, 70
    )  # change preset to random value so soundfont is randomly selected.
    gen_inst.midiProgram = preset
    melody.insert(0, gen_inst)

    current_time = 0.0
    max_time = NUM_MEASURES * 4.0  # measured in quarter notes

    previous_note = biased_note_choice(
        {"low": 0.35, "middle": 0.5, "high": 0.15}
    )  # Start with a random note

    active_notes = []  # lets us keep track of num notes active

    while current_time < max_time:  # while within 4 measures
        if random.random() < NOTE_PROBABILITY:  # add note or not? (NOTE_PROBABILITY)
            note_duration = random.choice(DURATIONS)  # pick random duration
            if (
                current_time + note_duration > max_time
            ):  # shorten if more than 4 measures after duration
                note_duration = max_time - current_time

            # Generate a new note within one octave of the previous note
            next_note = previous_note + random.randint(
                -MAX_JUMP, MAX_JUMP
            )  # pick random note index within octave of previous note
            next_note = max(
                LOWEST_NOTE, min(next_note, HIGHEST_NOTE)
            )  # stay within bounds if needed
            new_note = note.Note(
                midi=next_note, quarterLength=note_duration
            )  # create not object

            # update active notes for this time slice
            active_notes = [
                (start, end, n) for start, end, n in active_notes if end > current_time
            ]

            if (
                len(active_notes) < MAX_ACTIVE_NOTES
            ):  # If there's less than MAX_ACTIVE_NOTES being played
                melody.insert(current_time, new_note)  # add note to MIDI
                active_notes.append(
                    (current_time, current_time + note_duration, new_note)
                )  # add to active notes
                previous_note = next_note  # Update the previous note
        else:
            melody.insert(
                current_time, note.Rest(quarterLength=0.25)
            )  # add rest 20% of the time

        current_time += 0.25  # Move forward to the next time slice

    save_midi(melody, filename)


# Generate 16ths or 8ths or 4ths chugging one note so the model can recognize repeated notes. Consider having a chance for the one note to be a chord instead, and maybe randomly add a generated melody on top.
def generate_chugga(filename):
    NOTE_PROBABILITY = 0.9  # High probability of note repetition for chugging
    CHORD_PROBABILITY = 0.2  # Chance of playing a chord instead of a single note
    MAX_CHORD_SIZE = 3  # Maximum size for chords (triads)

    melody = stream.Part()
    melody.append(clef.TrebleClef())

    gen_inst = instrument.Guitar()
    preset = random.randint(
        0, 70
    )  # change preset to random value so soundfont is randomly selected.
    gen_inst.midiProgram = preset
    melody.insert(0, gen_inst)

    current_time = 0.0
    max_time = NUM_MEASURES * 4.0
    num_chords_left = 0
    chord_notes = []

    chug_note = biased_note_choice({"low": 0.45, "middle": 0.45, "high": 0.10})
    # chug_notes = [biased_note_choice({'low': 0.7, 'middle': 0.15, 'high': 0.15}) for _ in range(4)]  # choose the base note for chugging

    while current_time < max_time:
        # chug_note = chug_notes[int(current_time / 4)] # choose different chugging note for each measure, just to cover more range
        if num_chords_left > 0:  # if we're doing a string of chords, add them
            note_duration = random.choice(
                [0.25, 0.25, 0.5]
            )  # mostly 16ths or 8ths for chugging rhythms, but some variation in data
            for sub_note in chord_notes:  # add all notes in chord
                new_note = note.Note(
                    midi=sub_note, quarterLength=note_duration
                )  # create note objects
                melody.insert(current_time, new_note)  # add notes to MIDI
            num_chords_left -= 1
        else:  # if we're not playing chords, continue chugging
            if random.random() < NOTE_PROBABILITY:
                # note_duration = random.choice([0.25, 0.25, 0.5])   # mostly 16ths or 8ths for chugging rhythms, but some variation in data
                note_duration = 0.25
                if random.random() < CHORD_PROBABILITY:
                    # create a chord by adding two more notes to the base note
                    chord_notes = [chug_note]
                    for _ in range(random.randint(1, MAX_CHORD_SIZE - 1)):
                        chord_note = chug_note + random.choice(
                            [3, 4, 7]
                        )  # add small harmonic intervals randomly
                        chord_notes.append(
                            min(HIGHEST_NOTE, chord_note)
                        )  # keep within bounds

                    for sub_note in chord_notes:  # add all notes in chord
                        new_note = note.Note(
                            midi=sub_note, quarterLength=note_duration
                        )  # create note objects
                        melody.insert(current_time, new_note)  # add notes to MIDI
                    num_chords_left = random.randint(
                        0, 3
                    )  # ranging from 1 to 4 chords (already added one)
                else:  # add chugga note if not chords
                    new_note = note.Note(midi=chug_note, quarterLength=note_duration)
                    melody.insert(current_time, new_note)
            else:
                melody.insert(current_time, note.Rest(quarterLength=0.25))

        # current_time += random.choice([0.25, 0.25, 0.5, 0.5, 1]) # 16th or 8th, to add some variation in rhythms
        current_time += random.choice([0.25, 0.25, 0.5])

    save_midi(melody, filename)


# Generate chord triads with occasional random notes, maybe do arpeggios/rolled chords
def generate_chords(filename):
    ARPEGGIO_PROBABILITY = 0.3  # Chance of arpeggiating instead of playing full chord
    chord_types = [
        [0, 4, 7],  # major triad
        [0, 3, 7],  # minor triad
        [0, 4, 7, 10],  # major triad, minor 7th (dominant 7th)
        [0, 3, 7, 10],  # minor triad, minor 7th
        [0, 4, 7, 11],  # major triad, major 7th
        [0, 3, 6],  # diminished triad
        [0, 4, 8],  # augmented triad
        [0, 2, 7],  # suspended 2nd (sus2)
        [0, 5, 7],  # suspended 4th (sus4)
        [0, 4, 7, 11, 14],  # major 9th
        [0, 3, 7, 10, 14],  # minor 9th
        [0, 4, 7, 10, 13],  # dominant 7th flat 9
        [0, 4, 7, 10, 9],  # dominant 7th sharp 13
    ]

    melody = stream.Part()
    melody.append(clef.TrebleClef())

    gen_inst = instrument.Guitar()
    preset = random.randint(
        0, 70
    )  # change preset to random value so soundfont is randomly selected.
    gen_inst.midiProgram = preset
    melody.insert(0, gen_inst)

    current_time = 0.0
    max_time = NUM_MEASURES * 4.0

    while current_time < max_time:
        note_duration = random.choice([1.0, 2.0, 4.0])
        if current_time + note_duration > max_time:
            note_duration = max_time - current_time

        root_note = biased_note_choice(
            {"low": 0.5, "middle": 0.5, "high": 0}
        )  # Base note for chord, don't do high notes cause they clump at top of range.

        chord_offsets = random.choice(
            chord_types
        )  # choose random chord (M7, m7, Major, Minor, etc.)
        chord_notes = [
            min(HIGHEST_NOTE, root_note + offset) for offset in chord_offsets
        ]  # chord based on root is formed

        if random.random() < ARPEGGIO_PROBABILITY:
            # Play the chord as an arpeggio
            for i, chord_note in enumerate(chord_notes):
                arpeggio_note = note.Note(
                    midi=chord_note, quarterLength=note_duration
                )  # same duration
                melody.insert(
                    current_time + i * ((note_duration / 2) / len(chord_notes)),
                    arpeggio_note,
                )  # offset notes
        else:
            # Play the chord as a block chord
            for sub_note in chord_notes:  # add all notes in chord
                new_note = note.Note(
                    midi=sub_note, quarterLength=note_duration
                )  # create note objects
                melody.insert(current_time, new_note)  # add notes to MIDI

        current_time += note_duration

    save_midi(melody, filename)


def save_midi(melody, midi_filename):
    # save to file
    # midi_filename = 'MIDIs/' + classification + filename + '.mid'
    mf = midi.translate.music21ObjectToMidiFile(melody)
    mf.open(midi_filename, "wb")
    mf.write()
    mf.close()


def generate_all(filename):
    generate_random_weighted(filename)
    generate_melody(filename)
    generate_chugga(filename)
    generate_chords(filename)


def generate_random(filename):
    function_id = random.randint(1, 4)

    if function_id == 1:
        generate_random_weighted(filename)
    elif function_id == 2:
        generate_melody(filename)
    elif function_id == 3:
        generate_chugga(filename)
    elif function_id == 4:
        generate_chords(filename)


# LEGACY CODE (just for my reference for when I inevitably screw something up):

# import mido  # Import the mido library for MIDI file handling
# import numpy as np  # Import numpy for numerical operations
# import matplotlib.pyplot as plt  # Import matplotlib for plotting

# # ---MIDI VISUALIZATION (Ignore)---

# def load_midi(file_path):
#     """Load the MIDI file and return the messages with their cumulative times."""
#     midi_file = mido.MidiFile(file_path)  # Load the MIDI file
#     messages_with_time = []  # Initialize a list to store messages with their cumulative times

#     # Initialize the current time
#     current_time = 0

#     # Iterate over each message in the MIDI file
#     for message in midi_file:
#         current_time += message.time  # Increment the current time by the time of the current message
#         messages_with_time.append((current_time, message))  # Append the message with the cumulative time to the list

#     return messages_with_time  # Return the list of messages with their cumulative times

# def get_note_periods(messages_with_time):
#     """Get the time periods for each note."""
#     note_periods = []  # Initialize a list to store note periods
#     notes_on = {}  # Dictionary to keep track of notes that are currently on

#     # Iterate over each message with its time
#     for time, message in messages_with_time:
#         if message.type == 'note_on' and message.velocity > 0:  # Check if the message is a 'note_on' with velocity > 0
#             if message.note not in notes_on:
#                 notes_on[message.note] = []  # Initialize a list for the note if not already present
#             notes_on[message.note].append(time)  # Add the time to the list of times for the note
#         elif message.type == 'note_off' or (message.type == 'note_on' and message.velocity == 0):
#             if message.note in notes_on and notes_on[message.note]:  # Check if the note is in the notes_on dictionary
#                 start_time = notes_on[message.note].pop()  # Get the start time for the note
#                 note_periods.append((message.note, start_time, time))  # Add the note period to the list

#     # Handle notes that were not turned off
#     for note, times in notes_on.items():
#         for start_time in times:
#             note_periods.append((note, start_time, messages_with_time[-1][0]))  # Add the note period with the last time

#     return note_periods  # Return the list of note periods

# def create_note_dict(note_periods):
#     """Create a dictionary of note periods."""
#     note_dict = {}  # Initialize a dictionary to store note periods
#     note_id = 0  # Initialize a note ID counter

#     # Iterate over each note period
#     for note, start_time, end_time in note_periods:
#         note_dict[note_id] = [note, (start_time, end_time)]  # Add the note period to the dictionary
#         note_id += 1  # Increment the note ID counter

#     return note_dict  # Return the dictionary of note periods

# def get_notes_in_32nd_period(note_dict, start_time, end_time):
#     """Get one-hot encoded notes for a specific 32nd-note period."""
#     notes_playing = set()  # Initialize a set to store notes that are playing
#     period_duration = end_time - start_time  # Calculate the duration of the period
#     threshold = period_duration / 2  # Set a threshold for note overlap

#     # Iterate over each note in the dictionary
#     for note_info in note_dict.values():
#         note, (note_start, note_end) = note_info
#         overlap_start = max(note_start, start_time)  # Calculate the start of the overlap
#         overlap_end = min(note_end, end_time)  # Calculate the end of the overlap
#         overlap_duration = overlap_end - overlap_start  # Calculate the duration of the overlap

#         if overlap_duration > threshold:  # Check if the overlap duration is greater than the threshold
#             notes_playing.add(note)  # Add the note to the set of notes playing

#     # Create a one-hot encoded array for notes 40 to 88
#     one_hot_array = [0] * (88 - 40 + 1)
#     for note in notes_playing:
#         if 40 <= note <= 88:  # Check if the note is within the range 40 to 88
#             one_hot_array[note - 40] = 1  # Set the corresponding position in the array to 1

#     return one_hot_array  # Return the one-hot encoded array

# def get_all_32nd_note_periods(note_dict, start_time, end_time, period_duration):
#     """Generate one-hot encoded arrays for all 32nd-note periods."""
#     current_time = start_time  # Initialize the current time
#     periods = []  # Initialize a list to store one-hot encoded arrays

#     # Iterate over each 32nd-note period
#     while current_time < end_time:
#         next_time = current_time + period_duration  # Calculate the end time of the current period
#         one_hot_array = get_notes_in_32nd_period(note_dict, current_time, next_time)  # Get the one-hot encoded array
#         periods.append(one_hot_array)  # Add the array to the list
#         current_time = next_time  # Move to the next period

#     return periods  # Return the list of one-hot encoded arrays

# def create_midi_tensors(file_path):
#     """Main function to load the MIDI file and get one-hot encoded note periods."""
#     messages_with_time = load_midi(file_path)  # Load the MIDI file
#     note_periods = get_note_periods(messages_with_time)  # Get the note periods
#     note_dict = create_note_dict(note_periods)  # Create a dictionary of note periods

#     one_hot_encoded_periods = get_all_32nd_note_periods(note_dict, 0, 8, 0.0625)  # Get one-hot encoded note periods

#     return np.array(one_hot_encoded_periods)  # Return the one-hot encoded periods as a numpy array

# def visualize_midi(file_path):
#     """Visualize the MIDI content as an image showing notes in a horizontal format."""
#     messages_with_time = load_midi(file_path)  # Load the MIDI file
#     note_periods = get_note_periods(messages_with_time)  # Get the note periods

#     fig, ax = plt.subplots()  # Create a new figure and axis for plotting

#     # Iterate over each note period and plot it
#     for note, start_time, end_time in note_periods:
#         ax.plot([start_time, end_time], [note, note], marker='|')  # Plot each note period as a horizontal line

#     ax.set_xlabel('Time (seconds)')  # Set the x-axis label
#     ax.set_ylabel('MIDI Note Number')  # Set the y-axis label
#     plt.title('MIDI Note Visualization ('+file_path+')')  # Set the plot title
#     plt.show()  # Display the plot

# # Example usage (uncomment to use):
# # visualize_midi("path_to_your_midi_file.mid")
# generate_all("test_midi")
# visualize_midi("advancedMIDIs/chords-test_midi.mid")
# visualize_midi("advancedMIDIs/chugga-test_midi.mid")
# visualize_midi("advancedMIDIs/melodic-test_midi.mid")
# visualize_midi("advancedMIDIs/random-test_midi.mid")

# NEXT STEPS: find soundfonts, spectrogram/data generation in js

# import random
# from music21 import stream, note, clef, midi, instrument
# # from mido import MidiFile, MetaMessage, Message

# # Constants
# LOWEST_NOTE = 40  # MIDI number for E2
# HIGHEST_NOTE = 88  # MIDI number for E6
# NOTE_PROBABILITY = 0.7  # Probability of a note being played instead of a rest
# NUM_MEASURES = 4
# NOTES_PER_MEASURE = 16  # 16 sixteenth-notes per measure
# DURATIONS = [0.25, 0.5, 1.0, 2.0, 4.0]  # 16th, 8th, quarter, half, whole
# MAX_ACTIVE_NOTES = 5

# def biased_note_choice():
#     ranges = {
#         'low': (40, 60),
#         'middle': (61, 73),
#         'high': (74, 88)
#     }
#     probabilities = {
#         'low': 0.5,
#         'middle': 0.35,
#         'high': 0.15
#     }
#     selected_range = random.choices(
#         population=list(ranges.keys()),
#         weights=list(probabilities.values()),
#         k=1
#     )[0]

#     return random.randint(*ranges[selected_range])

# def generate_melody():
#     melody = stream.Part()
#     melody.append(clef.TrebleClef())

#     # Create a generic Instrument, since music21 might not handle custom bank/program directly
#     gen_inst = instrument.Guitar()
#     # gen_inst.midiProgram = 26  # Acoustic guitar, adjust if needed
#     melody.insert(0, gen_inst)

#     # Manually insert a MIDI program change
#     # Bank select MSB (0) and LSB (32) followed by Program Change
#     # For General MIDI, bank numbers start from 0, multiplied by 128 for MSB
#     # bank_msb = midi.MidiControlChange(channel=0, control=0, value=7)
#     # bank_lsb = midi.MidiControlChange(channel=0, control=32, value=0)
#     # prog_change = midi.MidiProgramChange(channel=0, program=26)  # program number is 0-indexed, 27th program

#     # melody.insert(0, bank_msb)
#     # melody.insert(0, bank_lsb)
#     # melody.insert(0, prog_change)

#     current_time = 0.0
#     max_time = NUM_MEASURES * 4.0

#     active_notes = []

#     while current_time < max_time:
#         if random.random() < NOTE_PROBABILITY:
#             note_duration = random.choice(DURATIONS)
#             if current_time + note_duration > max_time:
#                 note_duration = max_time - current_time

#             midi_note = biased_note_choice()
#             new_note = note.Note(midi=midi_note, quarterLength=note_duration)
#             active_notes = [(start, end, n) for start, end, n in active_notes if end > current_time]

#             if len(active_notes) < MAX_ACTIVE_NOTES:
#                 melody.insert(current_time, new_note)
#                 active_notes.append((current_time, current_time + note_duration, new_note))
#             else:
#                 melody.insert(current_time, note.Rest(quarterLength=0.25))
#         else:
#             melody.insert(current_time, note.Rest(quarterLength=0.25))
#         current_time += 0.25

#     return melody

# # def modify_midi(file_path):
# #     # Load the MIDI file
# #     midi = MidiFile(file_path)

# #     # Access the first track in the MIDI file
# #     # print(midi.tracks)
# #     track = midi.tracks[1]

# #     # Adding track name and instrument change at the beginning of the track
# #     track.insert(3, MetaMessage('track_name', name='Guitar Track', time=0))
# #     track.insert(4, Message('program_change', program=26, time=0))  # Guitar program

# #     # Add bank select messages
# #     track.insert(5, Message('control_change', control=0, value=7, time=0))  # MSB for bank 7
# #     track.insert(6, Message('control_change', control=32, value=0, time=0))  # LSB for bank 0

# #     # Save the modified MIDI file
# #     midi.save(file_path)
# #     print(midi.tracks)


# def generate_random_basic(filename):
#     # Generate and save MIDI file
#     melody = generate_melody()
#     midi_filename = 'MIDIs/' + filename + '.mid'
#     # melody.show()

#     # Save as MIDI with custom bank and preset
#     mf = midi.translate.music21ObjectToMidiFile(melody)
#     mf.open(midi_filename, 'wb')
#     mf.write()
#     mf.close()

# modify_midi(midi_filename)


# import random
# from mido import MidiFile, MidiTrack, Message, MetaMessage

# # Constants
# LOWEST_NOTE = 40  # MIDI number for E2
# HIGHEST_NOTE = 88  # MIDI number for E6
# NOTE_PROBABILITY = 0.7  # Probability of a note being played instead of a rest
# NUM_MEASURES = 4
# NOTES_PER_MEASURE = 16  # 16 sixteenth-notes per measure
# DURATIONS = [0.25, 0.5, 1.0, 2.0, 4.0]  # durations in terms of beats
# MAX_ACTIVE_NOTES = 5

# def biased_note_choice():
#     ranges = {'low': (40, 60), 'middle': (61, 73), 'high': (74, 88)}
#     probabilities = {'low': 0.5, 'middle': 0.35, 'high': 0.15}
#     selected_range = random.choices(list(ranges.keys()), weights=list(probabilities.values()), k=1)[0]
#     return random.randint(*ranges[selected_range]) #return random note range

# def generate_melody_mido():
#     mid = MidiFile()
#     track = MidiTrack()
#     mid.tracks.append(track)

#     # Add track name and instrument change
#     track.append(MetaMessage('track_name', name='Guitar Track', time=0))
#     track.append(Message('program_change', program=26, time=0))  # Guitar program (adjust if necessary)

#     # Add bank select messages (Control 0 for MSB, Control 32 for LSB)
#     track.append(Message('control_change', control=0, value=7, time=0))  # MSB for bank 7
#     track.append(Message('control_change', control=32, value=0, time=0))  # LSB for bank 0

#     ticks_per_beat = mid.ticks_per_beat  # Default 480 ticks per beat
#     ticks_per_16th = ticks_per_beat // 4  # Ticks per 16th note
#     max_ticks = NUM_MEASURES * 4 * ticks_per_beat  # Total ticks for 4 measures

#     current_time = 0  # Track the absolute time in ticks
#     active_notes = []

#     while current_time < max_ticks:
#         if random.random() < NOTE_PROBABILITY:
#             note_duration = int(random.choice(DURATIONS) * ticks_per_beat)
#             if current_time + note_duration > max_ticks:
#                 note_duration = max_ticks - current_time

#             midi_note = biased_note_choice()

#             # Remove notes that have ended
#             active_notes = [(start, end, n) for start, end, n in active_notes if end > current_time]

#             if len(active_notes) < MAX_ACTIVE_NOTES:
#                 delta_time = current_time - (sum([dur for _, dur, _ in active_notes]) if active_notes else 0)
#                 track.append(Message('note_on', note=midi_note, velocity=64, time=delta_time))
#                 track.append(Message('note_off', note=midi_note, velocity=64, time=note_duration))
#                 active_notes.append((current_time, current_time + note_duration, midi_note))
#                 current_time += note_duration  # Increment current_time by the note's duration
#             else:
#                 track.append(Message('note_off', note=0, velocity=0, time=ticks_per_16th))
#                 current_time += ticks_per_16th
#         else:
#             track.append(Message('note_off', note=0, velocity=0, time=ticks_per_16th))
#             current_time += ticks_per_16th


#     return mid


# def generate_random_basic(filename):
#     # Generate and save MIDI file
#     midi_file = generate_melody_mido()
#     midi_filename = 'MIDIs/' + filename + '.mid'
#     midi_file.save(midi_filename)


# it dont work :(
