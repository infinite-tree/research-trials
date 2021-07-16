// 
// Notes specific functions
// See utils.js for more
//
var current_study_row = -1;
var study_rows = [];

var study_name_input = document.getElementById("study-name");
var study_row_input = document.getElementById("study-row");
var study_list = document.getElementById("study-list");

var new_study_dialog = document.getElementById("new-study-dialog");
var new_study_spinner = document.getElementById("new-study-spinner");

async function inputHandler(e) {
    if (e.key === "Enter") {
        // tag entered. 
        e.preventDefault();
        await loadPlantByTag(input.value);
    } else {
        await arrowKeyHandler(e);
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
            spreadsheetId: INVENTORY_SPREADSHEET_ID,
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


function notesAppInit() {
    // Error handler
    initErrorDialog();

    // set focus to the text field and get the keys from it
    // input.focus();
    // input.select();
    // input.addEventListener('keydown', inputHandler);

    // Arrow buttons
    initArrowNav();
    

    // Load studies
    initStudySelector();

    // Load info if present
    loadByLocation();
}

// 
// Application Entry Point
// 
startGAuth(notesAppInit);