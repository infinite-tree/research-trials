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
    current_study_row = study_row_input.value;
    var study_name = study_name_input.value;

    // Studies: [0] name, [1] sheet. [2] folder
    var study_sheet_id = study_rows[current_study_row.value.toInt()][1];

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
        // FIXME: implement


    } catch (e) {
        showError(e);
    }
}

async function newStudyHandler(e) {
    var new_study_input = document.getElementById("new-study-input");
        
    new_study_spinner.classList.add("is-active");
    await createStudy(new_study_input.value);
    new_study_spinner.classList.remove("is-active");

    new_study_dialog.close();
    // FIXME: select the new study
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
        // for (const row of study_rows) {
        for (let x=0; x < study_rows.length; x++) {
            row = study_rows[x];
            // console.log(row);

            li = document.createElement('li');
            li.textContent = row[0]
            li.classList.add("mdl-menu__item");
            li.setAttribute('data-val', x.toString());
            study_list.appendChild(li);
        }

        // Refresh the select drop down
        getmdlSelect.init(".getmdl-select");
        
    } catch (e) {
        showError(e.toString());
    }
}

async function createStudy(study_name) {
    // 1. Create the Study folder
    // 2. Copy the template into it
    // 3. Add the study to the studies sheet
    // 4. update the selection menu

}

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

    // Load info if present
    loadByLocation();
}

// 
// Application Entry Point
// 
startGAuth(notesAppInit);