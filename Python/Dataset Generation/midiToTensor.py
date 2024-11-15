import numpy as np
import mido


# reads proprietary MIDI format (A series of message-time pairings. Seems terribly inefficient for being such a widespread format.)
def load_midi(file_path):
    midi_file = mido.MidiFile(file_path)
    messages_with_time = []

    # Initialize the current time
    current_time = 0

    for message in midi_file:
        # Increment the current time by the time of the current message
        current_time += message.time
        # Append the message with the cumulative time to the list
        messages_with_time.append((current_time, message))

    return messages_with_time


# converts proprietary MIDI format to (note, note_start, note_end)
def get_note_periods(messages_with_time):
    note_periods = []
    notes_on = {}

    for time, message in messages_with_time:
        if message.type == "note_on" and message.velocity > 0:
            note_periods.append((message.note, time, time))
            # if message.note not in notes_on:
            #     notes_on[message.note] = []
            # notes_on[message.note].append(time)
        # elif message.type == 'note_off' or (message.type == 'note_on' and message.velocity == 0):
        #     if message.note in notes_on and notes_on[message.note]:
        #         start_time = notes_on[message.note].pop()
        #         note_periods.append((message.note, start_time, time))

    # add note_end if one is never found (meaning the note goes beyond the end of the MIDI)
    # for note, times in notes_on.items():
    #     for start_time in times:
    #         note_periods.append((note, start_time, messages_with_time[-1][0]))

    return note_periods


# converts note_periods into an indexed dictionary
def create_note_dict(note_periods):
    note_dict = {}
    note_id = 0

    for note, start_time, end_time in note_periods:
        note_dict[note_id] = [note, (start_time, end_time)]
        note_id += 1

    return note_dict


# create one-hot encoded array of note-starts (if any) for a single 32nd-note slice
def get_notes_in_32nd_period(note_dict, start_time, end_time):
    notes_playing = set()

    for note_info in note_dict.values():
        note, (note_start, note_end) = note_info

        # if note beginning is in this period, mark it.
        if note_start == start_time:  # and note_start <= end_time:
            notes_playing.add(note)

    # convert into a one-hot encoded array for notes 40 to 88
    one_hot_array = [0] * (88 - 40 + 1)
    for note in notes_playing:
        if 40 <= note <= 88:
            one_hot_array[note - 40] = 1

    return one_hot_array


# create one-hot encoded arrays for all 32nd-note periods
def get_all_32nd_note_periods(note_dict, start_time, end_time, period_duration):
    current_time = start_time
    periods = []

    while current_time < end_time:
        next_time = current_time + period_duration
        one_hot_array = get_notes_in_32nd_period(note_dict, current_time, next_time)
        periods.append(one_hot_array)
        current_time = next_time

    return periods


# creates tensors representing note-beginnings in every 32nd note period of the MIDI.
def create_midi_tensors(file_path):
    messages_with_time = load_midi(file_path)
    # print(messages_with_time)
    note_periods = get_note_periods(messages_with_time)
    note_dict = create_note_dict(note_periods)

    one_hot_encoded_periods = get_all_32nd_note_periods(note_dict, 0, 8, 0.0625)

    return np.array(one_hot_encoded_periods)

