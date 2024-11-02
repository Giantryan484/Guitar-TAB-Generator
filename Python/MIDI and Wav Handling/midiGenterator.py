import random
from music21 import stream, note, clef, midi, instrument, tempo

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
    # gen_inst.midiProgram = 0
    # gen_inst.instrumentId = 0
    # gen_inst.midiChannel = 0
    # gen_inst.soundfontFn = "/Users/ryanmccormick/Downloads/Code/TAB-Generator/MIDI and Wav Handling/Guitars-Universal-V1.5.sf2"
    melody.insert(0, gen_inst)
    
    # melody.

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
    # preset = random.randint(
    #     0, 70
    # )  # change preset to random value so soundfont is randomly selected.
    # gen_inst.midiProgram = preset
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
    # preset = random.randint(
    #     0, 70
    # )  # change preset to random value so soundfont is randomly selected.
    # gen_inst.midiProgram = preset
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
    # preset = random.randint(
    #     0, 70
    # )  # change preset to random value so soundfont is randomly selected.
    # gen_inst.midiProgram = preset
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
