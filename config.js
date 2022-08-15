//
// Site specific config
//

// google app info
const CLIENT_ID = '590185719929-4rofi5nat6fubu3gs6bkpdqvfe491pf4.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDmKqIZruCNWNeorSfS3ddx7ariyT1Zu0s';

// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4", "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";

// id of the inventory spreadsheet (from the URL in google docs)
const INVENTORY_SPREADSHEET_ID = "1aUmFKWEgbNLJvqkG6RvfeZBt9r7dOn-8IHJ0XOJJ4cA";

// Inventory sheet locations
const INVENTORY_SHEET = "inventory";
const INVENTORY_RANGE = "inventory!A:M";

// Search Sheet locations
const SEARCH_SHEET = "search";

const ID_SEARCH_FIELD_RANGE = "search!B3";
const ID_SEARCH_RESULT_RANGE = "search!C3:M3";

const ROW_SEARCH_FIELD_RANGE = "search!C4";
const ROW_SEARCH_RESULT_RANGE = "search!C4:M4";

const CURRENT_ROW_TO_TAG = "search!C5";
const CURRENT_ROW_TO_TAG_RANGE = "search!C5:M5";
const LAST_PLANT_ID = "search!B6";

// Geo Sheet locations
const ACTIVE_LAT_LONG = "geo!B2:B3";
const NEAREST_GEO_PLANT = "geo!B8:O8";

// Studies sheet locations
const STUDIES_SPREADTSHEET_ID = "1mTdQHaPgySgroiDyB1EHxdU7Ca5zJw1NQ9z6dNyzVck";
const STUDIES_ACTIVE_RANGE = "active_studies!A4:C";
const STUDIES_PARENT_FOLDER_ID = "10xD-yWCn4xO83lR7KIjA44kLt4xiarI0";
const STUDY_TEMPLATE_SPREADHSEET_ID = "19Mrm4OrYZZgIoLjPcwGkrBSaHfaOHgX12Xpv4lyA6Co";
const STUDY_FIRST_RANGE = "notes!A1:F8";
const STUDY_TAGS = "notes!D2";
const STUDY_NOTE_COUNT = "notes!B2";
const STUDY_FIRST_NOTE_ROW = 4;
