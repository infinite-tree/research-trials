// 
// Notes specific functions
// See utils.js for more
//
const Keyboard = window.SimpleKeyboard.default;
const defaultKeyboardTheme = "hg-theme-default";
var virtual_keyboard_div = document.getElementById("virtual-keyboard");
var virtual_keyboard = null;

var scanner_buffer = "";

var current_study_row = -1;
var study_rows = [];

var study_name_input = document.getElementById("study-name");
var study_row_input = document.getElementById("study-row");
var study_list = document.getElementById("study-list");

var new_study_input = document.getElementById("new-study-input");
var new_study_dialog = document.getElementById("new-study-dialog");
var new_study_spinner = document.getElementById("new-study-spinner");

var note_cards = document.getElementById("note-cards");


function addStudiesToSelector(studies) {
    // Studies: [ [pos, name],...]
    for (let x=0; x < studies.length; x++) {
        study_info = studies[x];
        // console.log(study_info);

        var li = document.createElement('li');
        pos = study_info[0];
        li.textContent = study_info[1];
        li.classList.add("mdl-menu__item");
        li.setAttribute('data-val', pos.toString());
        study_list.appendChild(li);
    }

    // Refresh the select drop down
    getmdlSelect.init(".getmdl-select");
}

function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function loadNote(note_row) {
    // TODO: add share link

    // FIXME: images will be 2048 x 1152 or 1152 x 2048. Set card size appropriately
    // [0] Timestamp, [1] plant_id, [2] note, [3] photo link [4] photo id
    if (note_row.length > 4 && note_row[4].length > 0) {
        var card_html = `
        <div class="note-card photo-note-card mdl-cell mdl-cell--6-col mdl-cell--4-col-tablet mdl-cell--4-col-phone mdl-card mdl-shadow--3dp">
            <div class="mdl-card__title mdl-card--expand">
                <img class="note-img" src="https://drive.google.com/uc?export=view&id=${note_row[4]}">
            </div>
            <div class="mdl-card__supporting-text">
                ${note_row[2]}
            </div>
            <div class="mdl-card__actions mdl-card--border">
                <b>${note_row[1]}</b> <br> ${note_row[0]}
            </div>
        </div>`;

    } else {
        var card_html = `
        <div class="note-card text-note-card mdl-cell mdl-cell--6-col mdl-cell--4-col-tablet mdl-cell--4-col-phone mdl-card mdl-shadow--3dp">
            <div class="mdl-card__supporting-text">
                ${note_row[2]}
            </div>
            <div class="mdl-card__actions mdl-card--border">
                <b>${note_row[1]}</b> <br> ${note_row[0]}
            </div>
        </div>
        `;
    }
    note_cards.appendChild(htmlToElement(card_html));
    
    // Scroll to the end
    window.scrollTo(0,document.body.scrollHeight);
}


async function inputHandler(e) {
    if (virtual_keyboard_div !== null && virtual_keyboard_div.classList.contains("show-keyboard")) {
        // virtual keyboard is on-screen do nothing
    } else {
        console.log("physical keyboard input", e.key);

        if (e.key === "Enter") {
            // tag entered. 
            e.preventDefault();
            var plant_tag = scanner_buffer;
            scanner_buffer = "";
            await loadPlantByTag(plant_tag);
        } else if ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 65 && e.keyCode <= 90)) {
            // Alphanumeric values go into the tag buffer
            scanner_buffer += e.key;
        } else {
            await arrowKeyHandler(e);
        }
    }
}

async function studySelectionHandler(e) {
    console.log("Selected study");
    console.log(study_name_input.value);
    console.log(study_row_input.value);

    // Load Study
    // 1. fetch the spreadsheet data
    // 2. load the images and their notes into cards and chips
    // 3. scroll to the bottom (with each card)
    current_study_row = parseInt(study_row_input.value);
    var study_name = study_name_input.value;

    // Newly created studies are auto-selected and the element needs to 
    // be marked dirty
    study_name_input.parentElement.classList.add("is-dirty");

    // Studies: [0] name, [1] sheet. [2] folder
    var study_sheet_id = study_rows[current_study_row][1];

    try {
        // 1. fetch the notes
        var resp = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: study_sheet_id,
            range: STUDY_NOTES_RANGE
        });

        var result = resp.result;
        var numRows = result.values ? result.values.length : 0;
        if (numRows < 1) {
            // Nothing to do
            document.getElementById("study-notes-status").innerHTML = `No Notes for ${study_name}`;
            return;
        }

        // 2. load images and create cards
        note_cards.innerHTML = "";
        for(const row of result.values) {
            loadNote(row);
        }

    } catch (e) {
        showError(e);
        return;
    }
}


async function newStudyHandler(e) {
    var new_study_input = document.getElementById("new-study-input");
        
    new_study_spinner.classList.add("is-active");
    var res = await createStudy(new_study_input.value);
    new_study_spinner.classList.remove("is-active");
    new_study_dialog.close();

    // select the new study
    if (res.length > 0) {
        study_row_input.value = res[0];
        study_name_input.value = res[1];
        studySelectionHandler(null);
    }
}


async function initStudySelector() {
    loadActiveStudies();
    study_name_input.onchange = studySelectionHandler;

    // Connect the new study button
    document.getElementById("new-study-btn").addEventListener('click', function() {
        new_study_dialog.showModal();
    });

    // Connect the dialog's create button
    document.getElementById("create-new-study-btn").addEventListener('click', newStudyHandler);


    // connect the dialog's cancel button
    document.getElementById("close-new-study-btn").addEventListener('click', function() {
        new_study_dialog.close();
    });
}


async function loadActiveStudies() {
    // get studies from spreadsheet
    try {
        // Look up the list of studies
        var resp = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: STUDIES_SPREADTSHEET_ID,
            range: STUDIES_ACTIVE_RANGE
        });

        var result = resp.result;
        var numRows = result.values ? result.values.length : 0;
        if (numRows < 1) {
            // Nothing to do
            return;
        }

        // [0] study name, [1] study spreadsheet, [3] study folder
        study_rows = result.values;
        var studies = [];
        for(const row of study_rows) {
            studies.push([studies.length, row[0]]);
        }
        addStudiesToSelector(studies);
        
    } catch (e) {
        showError(e.toString());
    }
}

async function createStudy(study_name) {
    // 1. Create the Study folder
    // 2. Copy the template into it
    // 3. Add the study to the studies sheet
    // 4. update the selection menu


    // 1. create folder
    try {
        var resp = await gapi.client.drive.files.create({
            "resource": {
                "name": study_name,
                "mimeType": "application/vnd.google-apps.folder",
                "parents": [STUDIES_PARENT_FOLDER_ID]
            },
            "fields": "id"
        });

        var study_folder_id = resp.result.id;
        console.log("fodler id: ", study_folder_id);
    } catch (e) {
        showError(e.toString());
        return [];
    }

    // 2. copy the template into the folder
    try {
        resp = await gapi.client.drive.files.copy({
            "fileId": STUDY_TEMPLATE_SPREADHSEET_ID,
            "supportsAllDrives": true,
            "fields": "id",
            "resource": {
                "parents": [study_folder_id],
                "name": `${study_name}: Research Trial Notes`
            }
        });
        
        var notes_sheet_id = resp.result.id;
        console.log("notes_spreadsheet: ", notes_sheet_id);

    } catch (e) {
        if (e.result.error.message) {
            showError(e.result.error.message);
        } else {
            showError(e.toString());
        }

        // TODO: undo step 1
        return [];
    }

    // 3. Add the study to the studies sheet
    try {
        var resp = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: STUDIES_SPREADTSHEET_ID,
            range: STUDIES_ACTIVE_RANGE
        });

        var result = resp.result;
        var numRows = result.values ? result.values.length : 0;
        // [0] study name, [1] study spreadsheet, [3] study folder

        var resp = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: STUDIES_SPREADTSHEET_ID,
            range: STUDIES_ACTIVE_RANGE,
            insertDataOption: "INSERT_ROWS",
            valueInputOption: "USER_ENTERED",
            resource: {values: [[study_name, notes_sheet_id, study_folder_id]]}
        });

        study_rows.push([study_name, notes_sheet_id, study_folder_id]);
        addStudiesToSelector([[numRows, study_name]]);

    } catch (e) {
        showError(e.toString());
        // TODO: Undo steps 1 and 2
        return [];
    }
    
    return [numRows, study_name];
}

// 
// virtual Keyboard handling
// 
function handleShift() {
    let currentLayout = virtual_keyboard.options.layoutName;
    let shiftToggle = currentLayout === "default" ? "shift" : "default";

    virtual_keyboard.setOptions({
        layoutName: shiftToggle
    });
}

function handleNumbers() {
    let currentLayout = virtual_keyboard.options.layoutName;
    let numbersToggle = currentLayout !== "numbers" ? "numbers" : "default";
  
    virtual_keyboard.setOptions({
      layoutName: numbersToggle
    });
  }

function virtualInputChangeHandler(input) {
    console.log("Input changed", input);
    new_study_input.value = input;
    new_study_input.parentElement.classList.add("is-dirty");
}

function virtualKeyPressHandler(button) {
    console.log("Button pressed", button);
    if (button === "{shift}" || button === "{lock}") handleShift();
    if (button === "{numbers}" || button === "{abc}") handleNumbers();
    if (button === "{ent}") newStudyHandler(null);
}

function showVirtualKeyboard() {
    virtual_keyboard.setOptions({
        theme: `${defaultKeyboardTheme} show-keyboard`
    });
    virtual_keyboard_div.focus();
}
    
function hideVirtualKeyboard() {
    virtual_keyboard.setOptions({
        theme: defaultKeyboardTheme
    });
}

function initVirtualKeyboard() {
    // if ( "hid" in navigator) {
    if (1 != 1) {
        // Desktops do't need the virtual keyboard
    } else {
        // mobile devices with bluetooth scanners need the keyboard

        virtual_keyboard = new Keyboard({
            onChange: input => virtualInputChangeHandler(input),
            onKeyPress: button => virtualKeyPressHandler(button),
            mergeDisplay: true,
            layoutName: "default",
            layout: {
              default: [
                "q w e r t y u i o p",
                "a s d f g h j k l",
                "{shift} z x c v b n m {backspace}",
                "{numbers} {space} {ent}"
              ],
              shift: [
                "Q W E R T Y U I O P",
                "A S D F G H J K L",
                "{shift} Z X C V B N M {backspace}",
                "{numbers} {space} {ent}"
              ],
              numbers: ["1 2 3", "4 5 6", "7 8 9", "{abc} 0 {backspace}"]
            },
            display: {
              "{numbers}": "123",
              "{ent}": "return",
              "{escape}": "esc ⎋",
              "{tab}": "tab ⇥",
              "{backspace}": "⌫",
              "{capslock}": "caps lock ⇪",
              "{shift}": "⇧",
              "{controlleft}": "ctrl ⌃",
              "{controlright}": "ctrl ⌃",
              "{altleft}": "alt ⌥",
              "{altright}": "alt ⌥",
              "{metaleft}": "cmd ⌘",
              "{metaright}": "cmd ⌘",
              "{abc}": "ABC"
            }
        });

        new_study_input.addEventListener("input", event => {
            virtual_keyboard.setInput(event.target.value);
        });

        new_study_input.addEventListener("focus", (event) => {
            console.log("input focus");
            showVirtualKeyboard();
          });
    }
}

function notesAppInit() {
    // Error handler
    initErrorDialog();

    // Setup handler for "keyboard" (bluetooth scanner)
    document.addEventListener('keydown', inputHandler);

    // Arrow buttons
    initArrowNav();
    
    // Setup virtual keyboard
    initVirtualKeyboard();

    // Load studies
    initStudySelector();

    // Init action buttons (camera and mic)
    initCamera();
    // initMic();

    // Load info if present
    loadByLocation();
}

// 
// Application Entry Point
// 
startGAuth(notesAppInit);