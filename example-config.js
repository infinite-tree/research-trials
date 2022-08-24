//
// Site specific config
//

// google app info
const CLIENT_ID = '';
const API_KEY = '';
const MAPS_API_KEY = "";


// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

// id of the inventory spreadsheet (from the URL in google docs)
const INVENTORY_SPREADSHEET_ID = "";

// Inventory sheet locations
const INVENTORY_SHEET = "";
const INVENTORY_RANGE = "";

// Search Sheet locations
const SEARCH_SHEET = "";

const ID_SEARCH_FIELD_RANGE = "";
const ID_SEARCH_RESULT_RANGE = "";

const ROW_SEARCH_FIELD_RANGE = "";
const ROW_SEARCH_RESULT_RANGE = "";

const CURRENT_ROW_TO_TAG = "";
const CURRENT_ROW_TO_TAG_RANGE = "";
const LAST_PLANT_ID = "";

// Geo Sheet locations
const ACTIVE_LAT_LONG = "";
const NEAREST_GEO_PLANT = "";

// Studies sheet locations
const STUDIES_SPREADTSHEET_ID = "";         // Spreadhseet to track the studies generated
const STUDIES_ACTIVE_RANGE = "";            // Range in the spreadsheet with the studies listed. See the template
const STUDIES_PARENT_FOLDER_ID = "";        // The folder to keep studies in
const STUDY_TEMPLATE_SPREADHSEET_ID = "";   // Template spreadsheet to copy when creating a new study (holds teh study data)
const STUDY_FIRST_RANGE = "";               // Range within the above template that holds the first N rows of study data and header
const STUDY_TAGS = "";                      // Range within the above template that holds the list of all tags for the study
const STUDY_NOTE_COUNT = "";                // Range with the number of notes
const STUDY_FIRST_NOTE_ROW = ;              // First row of notes in the study template
