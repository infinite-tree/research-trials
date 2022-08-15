// 
// Notes specific functions
// See utils.js for more
//
const defaultKeyboardTheme = "hg-theme-default";

var scanner_buffer = "";

var current_study_row = -1;
var available_study_rows = [];
var study_data_rows = [];
var study_tags_cell = "";
var study_tags = [];
var study_sheet_id;
var study_folder_id;

var study_name_input = document.getElementById("study-name");
var study_row_input = document.getElementById("study-row");
var study_list = document.getElementById("study-list");

var new_study_input = document.getElementById("new-study-input");
var new_study_dialog = document.getElementById("new-study-dialog");
var new_study_spinner = document.getElementById("new-study-spinner");

var new_tag_dialog = document.getElementById("new-tag-dialog");

var note_cards = document.getElementById("note-cards");
var new_note_screen = document.getElementById("new-note-container");


// 
// Functions for Creating and displaying Studies
// 
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

function clearNotes() {
    note_cards.innerHTML = `
        <div class="mdl-cell mdl-cell--12-col">
            <br>
            <span id="study-notes-status">No Notes yet...</span>
        </div>
        <div class="mdl-cell mdl-cell--3-col mdl-cell--4-col-phone mdl-cell--4-col-tablet"></div>`;
};

function loadNote(timestamp, plant_id, tags, notes, photo_id, prepend=false) {
    // TODO: add share link

    // add tags
    var tag_chips = "";
    tags.forEach(tag => {
        tag_chips += `
        <span class="mdl-chip">
            <span class="mdl-chip__text">${tag}</span>
        </span>
        `;
    });

    if (photo_id && photo_id.length > 0) {
        var card_html = `
        <div class="note-card photo-note-card mdl-cell mdl-cell--6-col mdl-cell--4-col-tablet mdl-cell--4-col-phone mdl-card mdl-shadow--3dp">
            <div class="mdl-card__title">
                <div class="mdl-card__title-text">${plant_id}</div>
                <div class="mdl-card__subtitle-text note-subtitle">${timestamp}</div>
            </div>
            <div class="mdl-card__menu">
                <button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect">
                <i class="material-icons">share</i>
                </button>
            </div>
            <div class="mdl-card__media">
                <img class="note-img" src="https://drive.google.com/uc?export=view&id=${photo_id}">
            </div>
            <div class="mdl-card__supporting-text min-pad">
                ${notes}
            </div>
            <div class="mdl-card__actions mdl-card--border note-tags">
                ${tag_chips}
            </div>
        </div>`;

    } else {
        var card_html = `
        <div class="note-card text-note-card mdl-cell mdl-cell--6-col mdl-cell--4-col-tablet mdl-cell--4-col-phone mdl-card mdl-shadow--3dp">
            <div class="mdl-card__title">
                <div class="mdl-card__title-text">${plant_id}</div>
                <div class="mdl-card__subtitle-text note-subtitle">${timestamp}</div>
            </div>
            <div class="mdl-card__supporting-text">
                ${notes}
            </div>
            <div class="mdl-card__actions mdl-card--border note-tags">
                ${tag_chips}
            </div>
        </div>
        `;
    }
    
    if (prepend) {
        note_cards.prepend(htmlToElement(card_html));
    } else {
        note_cards.append(htmlToElement(card_html));
    }
    
    // Scroll to the end
    // window.scrollTo(0 ,document.body.scrollHeight);
}

async function loadStudyHandler(e) {
    console.log("Selected study");
    console.log(study_name_input.value);
    console.log(study_row_input.value);
    clearNotes();

    // Load Study
    // 1. fetch the spreadsheet data
    // 2. Load the tags
    // 3. load the images and their notes into cards and chips
    // 4. scroll to the bottom (with each card)
    current_study_row = parseInt(study_row_input.value);
    var study_name = study_name_input.value;

    // Newly created studies are auto-selected and the element needs to 
    // be marked dirty
    study_name_input.parentElement.classList.add("is-dirty");

    // Studies: [0] name, [1] sheet. [2] folder
    study_sheet_id = available_study_rows[current_study_row][1];
    study_folder_id = available_study_rows[current_study_row][2];
    
    try {
        // 1. fetch the first few notes and header data
        var resp = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: study_sheet_id,
            range: STUDY_FIRST_RANGE
        });

        var result = resp.result;
        var numRows = result.values ? result.values.length : 0;
        console.log("result.values: ", result.values);
        study_data_rows = result.values;
        
        // 2. Load Tags
        if (numRows > 1) {
            // TODO: Tags are in D2 (this should come from the CONFIG)
            study_tags = [];
            if (result.values[1].length > 1) {
                if (result.values[1][3]) {
                    study_tags_cell = result.values[1][3];
                    study_tags = result.values[1][3].split(",").map(item => item.trim());
                    console.log("found tags: ", study_tags);
                } else {
                    study_tags_cell = "";
                    study_tags = [];
                }
            }
        }

        // Check if there are notes
        if (numRows <= 3) {
            // Nothing to do
            document.getElementById("study-notes-status").innerHTML = `No Notes for ${study_name}`;
        } else {

            // 3. load images and create cards
            note_cards.innerHTML = "";
            for(const note_row of result.values.slice(3)) {
                // FIXME: images will be 2048 x 1152 or 1152 x 2048. Set card size appropriately
                // [0] Timestamp, [1] plant_id, [2] tags, [3] note, [4] photo link [5] photo id
                var timestamp = note_row[0];
                var plant_id = note_row[1];
                var tags = note_row[2].split(",");
                var notes = note_row[3];
                var photo_id = note_row[5];

                // Don't wait on note loading
                loadNote(timestamp, plant_id, tags, notes, photo_id);
            }
        }
    } catch (e) {
        showError(e);
        return;
    }

    // Enable the note buttons if plant _id is already set
    if (current_plant_id) {
        console.log("enable btns");
        document.getElementById("new-photo-btn").disabled = false;
        document.getElementById("new-note-btn").disabled = false;
    }
}

// TODO: implement note loading on scroll


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
        loadStudyHandler(null);
    }
}


async function initStudySelector() {
    loadAvailableStudies();
    study_name_input.onchange = loadStudyHandler;

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


async function loadAvailableStudies() {
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
        available_study_rows = result.values;
        var studies = [];
        for(const row of available_study_rows) {
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

        study_folder_id = resp.result.id;
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

        available_study_rows.push([study_name, notes_sheet_id, study_folder_id]);
        addStudiesToSelector([[numRows, study_name]]);

    } catch (e) {
        showError(e.toString());
        // TODO: Undo steps 1 and 2
        return [];
    }
    
    return [numRows, study_name];
}


// 
// Functions for creating and showing notes
// 
function newNoteCancelHandler(e) {
    e.preventDefault();
    new_note_screen.hidden = true;
    document.getElementById("new-note-desc-input").value = "";
}

async function saveNewNote(plant_id, photo_src, tags, note) {
    var img_id = "";
    var img_link = "";
    // 1. upload the img if it exists
    if (photo_src != "") {
        var today = new Date();
        var today_date = `${today.getFullYear()}_${today.getMonth().toString().padStart(2, '0')}_${today.getDate().toString().padStart(2, '0')}`;
        var img_name = `${plant_id}_${today_date}.png`;

        // console.log("Study folder: ", study_folder_id);

        try {
            // TODO: revist files.create API. At the moment it does not appear to support multipart uploads
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            var fileContent = photo_src.split("base64,")[1];
            var metadata = {
                'name': img_name,
                'parents': [study_folder_id],
                'mimeType': 'text/plain\r\n\r\n'
            };

            var multipartRequestBody = delimiter +  'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: ' + 'image/png\r\n' + 'Content-Transfer-Encoding: base64\r\n\r\n' + fileContent + close_delim;

            var resp = await gapi.client.request({
                'path': '/upload/drive/v3/files',
                'method': 'POST',
                'params': {
                    'uploadType': 'multipart',
                    'supportsAllDrives': 'true',
                    'fields': 'id,webViewLink'
                },
                'headers': {
                    'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                },
                'body': multipartRequestBody
            });
    
            console.log(resp);
            if (resp.result.id) {
                img_id = resp.result.id;
                img_link = resp.result.webViewLink;
            } else {
                showError("Failed to save image");
                return [];
            }

        } catch (e) {
            showError(e.toString());
            return [];
        }
    }

    // 2. batchUpdate the row in the notes table
    // Timestamp,	Plant Id,	Tags,	Notes,	Photo link,	Photo Id
    var now = new Date();
    const note_timestamp = now.toLocaleString("en-US");
    const tags_str = tags.join(", ");
    const note_row_str = `${note_timestamp};${plant_id};${tags_str};${note};${img_link};${img_id}`;
    const create_row_request = {
        'insertRange': {
            'range': {
                'sheetId': 0,
                'startRowIndex': STUDY_FIRST_NOTE_ROW-1,
                'endRowIndex': STUDY_FIRST_NOTE_ROW
            },
            'shiftDimension': "ROWS"
           }
    };

    const paste_data_request = {
        'pasteData': {
            'data': note_row_str,
            'type': "PASTE_NORMAL",
            'delimiter': ";",
            'coordinate': {
                'sheetId': 0,
                'rowIndex': STUDY_FIRST_NOTE_ROW-1
            }
        }
    };

    try {
        resp = await gapi.client.sheets.spreadsheets.batchUpdate({
            'spreadsheetId': study_sheet_id
        },{
            requests: [create_row_request, paste_data_request]
        });

        console.log("batchupdate:");
        console.log(resp);
    } catch(e) {
        showError(e.toString());
        return [];
    }

    // return note_row;
    return [note_timestamp, plant_id, tags, note, img_link, img_id];
}

async function saveAndShowNote(plant_id, photo_src, tags, note) {
    // save the note
    var note_data = await saveNewNote(plant_id, photo_src, tags, note);

    // add the note to the screen
    if(note_data.length > 1) {
        // load the note on top (defaults to the bottom)
        // [0] Timestamp, [1] plant_id, [2] tags (array), [3] note, [4] photo link [5] photo id
        loadNote(note_data[0], note_data[1], note_data[2], note_data[3], note_data[5], true);
    }
}

function newNoteSaveHandler(e) {
    e.preventDefault();

    var tag_elem = document.getElementById("new-note-tags");
    var note_input = document.getElementById("new-note-desc-input");

    // Get tags
    var tags_selected = [];
    var tag_buttons = document.getElementById("new-note-tags").children;
    for(const tag_btn of tag_buttons) {
        // skip the add button
        if (tag_btn.firstElementChild.nodeName === "I") {
            continue;
        }
        if (tag_btn.classList.contains("mdl-button--colored")) {
            tags_selected.push(tag_btn.firstElementChild.innerHTML);
        }
    }
    // console.log("Tags enabled: " + tags_selected);

    var note = note_input.value;
    var img_src = document.getElementById("new-note-img").src;

    // clear input
    tag_elem.innerHTML = "";
    note_input.value = "";
    note_input.classList.remove("is-dirty");

    // save the new note & load the note card 
    // don't wait for the save to complete
    saveAndShowNote(current_plant_id, img_src, tags_selected, note);

    new_note_screen.hidden = true;
}

function toggleTagButtonHandler(e) {
    e.preventDefault();
    // var tag = this.firstChild.innerHTML;
    this.classList.toggle("mdl-button--colored");
    // console.log(`toggelTag: ${this.firstChild.innerHTML}`);
}

async function addTagHandler(e) {
    e.preventDefault();
    
    // Show the new tag dialog and connect the dialog buttons
    new_tag_dialog.showModal();

    // Connect the dialog's create button
    var create_btn = document.getElementById("create-new-tag-btn");
    create_btn.addEventListener('click', saveTagHandler);

    // Catch the enter key
    var new_tag_input = document.getElementById("new-tag-input");
    new_tag_input.onkeydown = e => {
        if (e.key=="Enter") {
            e.preventDefault();
            create_btn.click();
            return false;
         } else {
            return true;
         }
    };

    // connect the dialog's cancel button
    document.getElementById("close-new-tag-btn").addEventListener('click', function() {
        new_tag_dialog.close();
    });
}

async function createTag(tag) {
    // Add the new tag to the tag list in the study spreadsheet
    var new_tags_cell;
    if (study_tags_cell.length > 0) {
        new_tags_cell = study_tags_cell + ", " + tag;
    } else {
        new_tags_cell = tag;
    }
    try {
        var resp = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: study_sheet_id,
            range: STUDY_TAGS,
            valueInputOption: "USER_ENTERED",
            resource: {values: [[new_tags_cell]]}
        });
    } catch (e) {
        showError(e.toString());
        return false;
    }
    study_tags_cell = new_tags_cell;
    study_tags.unshift(tag);
    return true;
}

async function saveTagHandler(e) {
    var new_tag_input = document.getElementById("new-tag-input");
    var new_tag_spinner = document.getElementById("new-tag-spinner");
    var tag = new_tag_input.value;
    new_tag_spinner.classList.add("is-active");
    
    var res = await createTag(tag);
    
    new_tag_spinner.classList.remove("is-active");
    new_tag_dialog.close();

    // select the new tag
    if (res) {
        document.getElementById("new-note-tags").insertAdjacentHTML("afterbegin",
            `<button type="button" class="mdl-chip tag-btn mdl-js-ripple-effect mdl-button--colored">
                <span class="mdl-chip__text">${tag}</span>
             </button>\n`);
    }
}

function showAvailableTags() {
    // Display Tags
    var tags_html = "";
    console.log("study tags: ", study_tags);
    for(const tag of study_tags) {
        // enabled: add mdl-button--colored to classlist
        tags_html += `<button type="button" class="mdl-chip tag-btn mdl-js-ripple-effect">
                        <span class="mdl-chip__text">${tag}</span>
                      </button>\n`;
    }
    tags_html += `<button class="mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored" id="add-tag-btn">
                    <i class="material-icons">add</i>
                  </button>`;

    document.getElementById("new-note-tags").innerHTML = tags_html;

    // wire the tag buttons
    var tag_btns = document.getElementsByClassName("tag-btn");
    for (var tag_btn of tag_btns) {
        tag_btn.addEventListener('click', toggleTagButtonHandler);
    }
    document.getElementById("add-tag-btn").addEventListener('click', addTagHandler);
}

function newPhotoNote(img_url) {

    // Wire up buttons
    document.getElementById("new-note-cancel-btn").addEventListener("click", newNoteCancelHandler);
    document.getElementById("new-note-save-btn").addEventListener("click", newNoteSaveHandler);

    // Handle enter key (do nothing)
    var note_input = document.getElementById("new-note-desc-input");
    note_input.onkeydown = e => {
        if (e.key=="Enter") {
            e.preventDefault();
            return false;
         }
         return true;
    };
    
    // Set the image url
    document.getElementById("new-note-img").src = img_url;

    // Fill out plant info
    var now = new Date();
    document.getElementById("new-note-id").innerHTML = current_plant_id;
    document.getElementById("new-note-time").innerHTML = now.toLocaleString("en-US");

    // Camera screen is already hidden. Show the new note screen
    new_note_screen.hidden = false;
    document.getElementById("camera-screen").hidden = true;

    // Display tags
    showAvailableTags();
}

function onNewNoteButton(e) {
    e.preventDefault();

    // Wire up the buttons
    document.getElementById("new-note-cancel-btn").addEventListener("click", newNoteCancelHandler);
    document.getElementById("new-note-save-btn").addEventListener("click", newNoteSaveHandler);

    // Fill out plant info
    var now = new Date();
    document.getElementById("new-note-id").innerHTML = current_plant_id;
    document.getElementById("new-note-time").innerHTML = now.toLocaleString("en-US");

    // populate tags
    showAvailableTags();

    // load the new note screen
    document.getElementById("new-note-img-container").hidden = true;
    new_note_screen.hidden = false;
}

// 
// GPS handlers
//
async function onLookupGeotagButton(e) {
    e.preventDefault();

    // update display while searching
    plant_info.innerHTML = "Looking ...";
    info_spinner.classList.add("is-active");
    input.value = "";
    input.parentElement.classList.remove("is-dirty");


    if(await lookupPlantByGeo(active_lat, active_long)) {        
        displayCurrentGeoPlant();
        if (current_study_row >= 0) {
            // Enable the note buttons
            console.log("enable btns");
            document.getElementById("new-photo-btn").disabled = false;
            document.getElementById("new-note-btn").disabled = false;
        }
    } else {
        clearPlantInfo();
    }
    info_spinner.classList.remove("is-active");
}

function gpsConnected() {
    plant_id_chip.innerHTML = "Tap Lookup";
}

function updateLatLongCallback(lat, long) {
    updateLatLongInput(lat, long);

    // display distance from plant
    if (current_plant_id != "") {
        var ft_dist = calcDistance(current_plant_lat, current_plant_long, lat, long);
        console.log("distance: ", ft_dist);
        document.getElementById("dist-span").innerHTML = `<b>(${ft_dist} ft away)</b>`;
    }
}


// 
// Entry Point
//
async function notesAppInit() {

    // Error handler
    initErrorDialog();

    initVersionInfo();

    // Load the google drive API
    await gapi.client.load('drive', 'v3');

    // Load studies
    initStudySelector();

    // Init GPS
    document.getElementById('lookup-geotag-btn').addEventListener('click', onLookupGeotagButton);
    initGPS(updateLatLongCallback, gpsConnected, clearLatLong);

    // Init Camera handling (new photo note)
    initCamera(newPhotoNote);

    // Hookup new text note button
    document.getElementById("new-note-btn").addEventListener('click', onNewNoteButton);


    // Load info if present
    loadByWindowLocation();
}

// 
// Application Entry Point
// 
startGAuth(notesAppInit);