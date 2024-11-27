import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const midi_to_note = ['E|2', 'F|2', 'F#|2', 'G|2', 'G#|2', 'A|2', 'A#|2', 'B|2', 'C|3', 'C#|3', 'D|3', 'D#|3', 'E|3', 'F|3', 'F#|3', 'G|3', 'G#|3', 'A|3', 'A#|3', 'B|3', 'C|4', 'C#|4', 'D|4', 'D#|4', 'E|4', 'F|4', 'F#|4', 'G|4', 'G#|4', 'A|4', 'A#|4', 'B|4', 'C|5', 'C#|5', 'D|5', 'D#|5', 'E|5', 'F|5', 'F#|5', 'G|5', 'G#|5', 'A|5', 'A#|5', 'B|5', 'C|6', 'C#|6', 'D|6', 'D#|6', 'E|6'];

const midi_to_sfret = {
    'E|2': ['E|0'],
    'F|2': ['E|1'],
    'F#|2': ['E|2'],
    'G|2': ['E|3'],
    'G#|2': ['E|4'],
    'A|2': ['E|5', 'A|0'],
    'A#|2': ['E|6', 'A|1'],
    'B|2': ['E|7', 'A|2'],
    'C|3': ['E|8', 'A|3'],
    'C#|3': ['E|9', 'A|4'],
    'D|3': ['E|10', 'A|5', 'D|0'],
    'D#|3': ['E|11', 'A|6', 'D|1'],
    'E|3': ['E|12', 'A|7', 'D|2'],
    'F|3': ['E|13', 'A|8', 'D|3'],
    'F#|3': ['E|14', 'A|9', 'D|4'],
    'G|3': ['E|15', 'A|10', 'D|5', 'G|0'],
    'G#|3': ['E|16', 'A|11', 'D|6', 'G|1'],
    'A|3': ['E|17', 'A|12', 'D|7', 'G|2'],
    'A#|3': ['E|18', 'A|13', 'D|8', 'G|3'],
    'B|3': ['E|19', 'A|14', 'D|9', 'G|4', 'b|0'],
    'C|4': ['E|20', 'A|15', 'D|10', 'G|5', 'b|1'],
    'C#|4': ['E|21', 'A|16', 'D|11', 'G|6', 'b|2'],
    'D|4': ['E|22', 'A|17', 'D|12', 'G|7', 'b|3'],
    'D#|4': ['E|23', 'A|18', 'D|13', 'G|8', 'b|4'],
    'E|4': ['A|19', 'D|14', 'G|9', 'b|5', 'e|0'],
    'F|4': ['A|20', 'D|15', 'G|10', 'b|6', 'e|1'],
    'F#|4': ['A|21', 'D|16', 'G|11', 'b|7', 'e|2'],
    'G|4': ['A|22', 'D|17', 'G|12', 'b|8', 'e|3'],
    'G#|4': ['A|23', 'D|18', 'G|13', 'b|9', 'e|4'],
    'A|4': ['D|19', 'G|14', 'b|10', 'e|5'],
    'A#|4': ['D|20', 'G|15', 'b|11', 'e|6'],
    'B|4': ['D|21', 'G|16', 'b|12', 'e|7'],
    'C|5': ['D|22', 'G|17', 'b|13', 'e|8'],
    'C#|5': ['D|23', 'G|18', 'b|14', 'e|9'],
    'D|5': ['G|19', 'b|15', 'e|10'],
    'D#|5': ['G|20', 'b|16', 'e|11'],
    'E|5': ['G|21', 'b|17', 'e|12'],
    'F|5': ['G|22', 'b|18', 'e|13'],
    'F#|5': ['G|23', 'b|19', 'e|14'],
    'G|5': ['b|20', 'e|15'],
    'G#|5': ['b|21', 'e|16'],
    'A|5': ['b|22', 'e|17'],
    'A#|5': ['b|23', 'e|18'],
    'B|5': ['e|19'],
    'C|6': ['e|20'],
    'C#|6': ['e|21'],
    'D|6': ['e|22'],
    'D#|6': ['e|23'],
    'E|6': ['e|24']
};

const sfret_to_note = { 'E|0': 0, 'E|1': 1, 'E|2': 2, 'E|3': 3, 'E|4': 4, 'E|5': 5, 'A|0': 5, 'E|6': 6, 'A|1': 6, 'E|7': 7, 'A|2': 7, 'E|8': 8, 'A|3': 8, 'E|9': 9, 'A|4': 9, 'E|10': 10, 'A|5': 10, 'D|0': 10, 'E|11': 11, 'A|6': 11, 'D|1': 11, 'E|12': 12, 'A|7': 12, 'D|2': 12, 'E|13': 13, 'A|8': 13, 'D|3': 13, 'E|14': 14, 'A|9': 14, 'D|4': 14, 'E|15': 15, 'A|10': 15, 'D|5': 15, 'G|0': 15, 'E|16': 16, 'A|11': 16, 'D|6': 16, 'G|1': 16, 'E|17': 17, 'A|12': 17, 'D|7': 17, 'G|2': 17, 'E|18': 18, 'A|13': 18, 'D|8': 18, 'G|3': 18, 'E|19': 19, 'A|14': 19, 'D|9': 19, 'G|4': 19, 'b|0': 19, 'E|20': 20, 'A|15': 20, 'D|10': 20, 'G|5': 20, 'b|1': 20, 'E|21': 21, 'A|16': 21, 'D|11': 21, 'G|6': 21, 'b|2': 21, 'E|22': 22, 'A|17': 22, 'D|12': 22, 'G|7': 22, 'b|3': 22, 'E|23': 23, 'A|18': 23, 'D|13': 23, 'G|8': 23, 'b|4': 23, 'A|19': 24, 'D|14': 24, 'G|9': 24, 'b|5': 24, 'e|0': 24, 'A|20': 25, 'D|15': 25, 'G|10': 25, 'b|6': 25, 'e|1': 25, 'A|21': 26, 'D|16': 26, 'G|11': 26, 'b|7': 26, 'e|2': 26, 'A|22': 27, 'D|17': 27, 'G|12': 27, 'b|8': 27, 'e|3': 27, 'A|23': 28, 'D|18': 28, 'G|13': 28, 'b|9': 28, 'e|4': 28, 'D|19': 29, 'G|14': 29, 'b|10': 29, 'e|5': 29, 'D|20': 30, 'G|15': 30, 'b|11': 30, 'e|6': 30, 'D|21': 31, 'G|16': 31, 'b|12': 31, 'e|7': 31, 'D|22': 32, 'G|17': 32, 'b|13': 32, 'e|8': 32, 'D|23': 33, 'G|18': 33, 'b|14': 33, 'e|9': 33, 'G|19': 34, 'b|15': 34, 'e|10': 34, 'G|20': 35, 'b|16': 35, 'e|11': 35, 'G|21': 36, 'b|17': 36, 'e|12': 36, 'G|22': 37, 'b|18': 37, 'e|13': 37, 'G|23': 38, 'b|19': 38, 'e|14': 38, 'b|20': 39, 'e|15': 39, 'b|21': 40, 'e|16': 40, 'b|22': 41, 'e|17': 41, 'b|23': 42, 'e|18': 42, 'e|19': 43, 'e|20': 44, 'e|21': 45, 'e|22': 46, 'e|23': 47, 'e|24': 48 };

// Function to calculate distance based on fret difference
export function get_distance(sfret1, sfret2) {
    const fret1 = parseInt(sfret1.split('|')[1]);
    const fret2 = parseInt(sfret2.split('|')[1]);

    if (fret1 === 0 || fret2 === 0) return 0;

    const distance_weights = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78, 91, 105, 120, 136, 153, 171, 190, 210, 231, 253, 276];
    return distance_weights[Math.abs(fret1 - fret2)];
}

// Check for duplicate strings
export function check_for_duplicate_strings(sfret_list) {
    const string_list = sfret_list.map(sfret => String(sfret).split('|')[0]);
    return new Set(string_list).size !== string_list.length;
}

// Generate combinations (equivalent of itertools.combinations)
export function generate_2_length_combinations(values_list) {
    const all_combinations = [];
    for (let i = 0; i < values_list.length; i++) {
        for (let j = i + 1; j < values_list.length; j++) {
            all_combinations.push([values_list[i], values_list[j]]);
        }
    }
    return all_combinations;
}

// Calculate score for a given set of frets
export function get_score(sfret_list, prev_center = 0) {
    const sfret_combinations = generate_2_length_combinations(sfret_list);
    let score = sfret_combinations.reduce((acc, pair) => acc + get_distance(pair[0], pair[1]), 0);

    if (!sfret_combinations.length && parseInt(sfret_list[0].split('|')[1]) === 0) {
        score = -1;
    }

    const center = get_center(sfret_list);
    const center_diff = Math.abs(prev_center - center);
    score += (2 * center_diff);

    return score;
}

// Generate combinations from dictionary values (like itertools.product)
export function generate_combinations(dictionary, keys) {
    const values_lists = keys.map(key => dictionary[key]);
    const all_combinations = cartesianProduct(values_lists);
    return all_combinations;
}

// Cartesian product (helper for combinations)
export function cartesianProduct(arrays) {
    if (arrays.length === 0) {
        return [];
    } else if (arrays.length === 1) {
        return arrays[0].map(element => [element]);
    } else {
        return arrays.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    }
}


// Calculate center of frets
export function get_center(sfret_list) {
    const sfret_list_no_zeros = sfret_list.map(sfret => parseInt(String(sfret).split('|')[1])).filter(fret => fret !== 0);
    return sfret_list_no_zeros.length === 0 ? 0 : Math.round(sfret_list_no_zeros.reduce((a, b) => a + b, 0) / sfret_list_no_zeros.length);
}

// Process slices of MIDI data
export function process_slices(midi_slices) {
    let prev_center = 0;
    const output_tabs = [];
    const old_slices = midi_slices;

    for (let slice_idx = 0; slice_idx < midi_slices.length; slice_idx += 2) {
        const current_slice = midi_slices[slice_idx];
        const notes_being_pressed = current_slice.map((val, i) => (typeof val !== 'string' && val > 0.5) ? midi_to_note[i] : null).filter(Boolean);
        const existing_fingerings = current_slice.filter(val => typeof val === 'string');

        if (notes_being_pressed.length === 0) {
            output_tabs.push([]);
            continue;
        }

        const possible_sfrets = generate_combinations(midi_to_sfret, notes_being_pressed);
        let best_score = Infinity;
        let best_combination = [];

        for (const combination of possible_sfrets) {
            if (!check_for_duplicate_strings(combination)) {
                const score = get_score([...combination, ...existing_fingerings], prev_center);
                if (score < best_score) {
                    best_score = score;
                    best_combination = combination;
                }
            }
        }

        prev_center = get_center([...best_combination, ...existing_fingerings]) - 1;
        output_tabs.push(best_combination);

        best_combination.forEach(sfret => {
            const index = sfret_to_note[sfret];
            let current_idx = slice_idx;
            while (current_idx < midi_slices.length && midi_slices[current_idx][index] > 0.5) {
                midi_slices[current_idx][index] = sfret;
                current_idx++;
            }
        });
    }

    return output_tabs;
}
// Format and output TABs
export function TABs_from_output(output) {
    // Initialize an object to store TABs for each string
    const TABs = { "E": [], "A": [], "D": [], "G": [], "b": [], "e": [] };

    // Populate the TABs object with positions and frets for each string
    output.forEach((notes_slice, i) => {
        notes_slice.forEach(sfret => {
            const [string, fret] = String(sfret).split("|");
            TABs[string].push([i, fret]);
        });
    });

    // Calculate the number of measures based on the output length
    const measures = Math.floor(output.length / 16) + 1;

    // Initialize an object to store formatted TABs for each string
    const formatted_tabs = { "E": [], "A": [], "D": [], "G": [], "b": [], "e": [] };

    // Iterate over each string to format the TABs
    Object.keys(TABs).forEach(string => {
        let current_measure = [];
        // Loop over each position in the measures
        for (let i = 0; i < measures * 16; i++) {
            // When a measure is complete (every 16 positions)
            if (i % 16 === 0 && current_measure.length > 0) {
                // Push the joined measure into formatted_tabs without extra symbols
                formatted_tabs[string].push(current_measure.join(''));
                current_measure = [];
            }

            // Default to empty fret position
            let note_at_position = "--";
            // Check if there's a note at the current position
            TABs[string].forEach(([pos, fret]) => {
                if (pos === i) {
                    // Adjust formatting for single or double-digit frets
                    note_at_position = fret.length === 2 ? fret : fret + "-";
                }
            });

            // Add the note or empty position to the current measure
            current_measure.push(note_at_position);
        }

        // Push any remaining notes in the last measure
        if (current_measure.length > 0) {
            formatted_tabs[string].push(current_measure.join(''));
        }
    });

    return formatted_tabs;
}



export async function export_TABs_to_pdf(formatted_tabs, title, measures_per_line = 3) {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();

    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const titleFontSize = 20;
    const tabFontSize = 12;

    const { width, height } = page.getSize();
    const margin = 50;
    const topMargin = 50;
    const lineHeight = 16;

    let yPosition = height - topMargin;

    page.drawText(title, {
        x: margin,
        y: yPosition,
        size: titleFontSize,
        font: titleFont,
        color: rgb(0, 0, 0),
    });

    yPosition -= 2 * lineHeight;

    function split_tabs_for_measures(formatted_tabs, measures_per_line) {
        const split_tabs = {
            "E": [],
            "A": [],
            "D": [],
            "G": [],
            "b": [],
            "e": []
        };

        Object.keys(formatted_tabs).forEach(string => {
            for (let i = 0; i < formatted_tabs[string].length; i += measures_per_line) {
                // Extract the measures for the current line
                const slice = formatted_tabs[string].slice(i, i + measures_per_line);
                // Join the measures with '|' between them
                split_tabs[string].push(slice.join("|"));
            }
        });

        return split_tabs;
    }

    const split_tabs = split_tabs_for_measures(formatted_tabs, measures_per_line);

    function drawTabLine(page, yPosition, split_tabs, font, tabFontSize) {
        const strings = ["e", "b", "G", "D", "A", "E"];
        strings.forEach(string => {
            // Draw the TAB line with the correct formatting
            page.drawText(string + "|" + split_tabs[string].shift() + "|", {
                x: margin,
                y: yPosition,
                size: tabFontSize,
                font: font,
                color: rgb(0, 0, 0),
            });
            yPosition -= lineHeight;
        });
        return yPosition;
    }


    while (split_tabs["E"].length > 0) {
        yPosition = drawTabLine(page, yPosition, split_tabs, font, tabFontSize);

        // Add a blank line after each set of TAB lines
        yPosition -= lineHeight;

        // Check if there's enough space for the next set of TAB lines
        if (yPosition < margin + lineHeight * 6) {
            page = pdfDoc.addPage();
            yPosition = height - topMargin;
        }
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}


// export function displayPDFInIframe(pdfBytes) {
//     const blob = new Blob([pdfBytes], { type: "application/pdf" });
//     const url = URL.createObjectURL(blob);

//     const iframe = document.createElement("iframe");
//     iframe.src = url;
//     iframe.width = "100%";
//     iframe.height = "600px";
//     document.body.appendChild(iframe);
// }

export async function processML_Outputs(midiArray, title) {
    const sfrets_output = process_slices(midiArray);
    console.log("output 1: ", sfrets_output);
    const formatted_tabs = TABs_from_output(sfrets_output);
    console.log("output 2: ", formatted_tabs);
    const pdfBytes = await export_TABs_to_pdf(formatted_tabs, title, 2);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const pdfUrl = URL.createObjectURL(blob);

    return pdfUrl;
}

// export default processML_Outputs