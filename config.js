//
// Site specific config
//

// google app info
var CLIENT_ID = '590185719929-4rofi5nat6fubu3gs6bkpdqvfe491pf4.apps.googleusercontent.com';
var API_KEY = 'AIzaSyDmKqIZruCNWNeorSfS3ddx7ariyT1Zu0s';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/spreadsheets";

// id of the inventory spreadsheet (from the URL in google docs)
var INVENTORY_SPREADSHEET_ID = "1aUmFKWEgbNLJvqkG6RvfeZBt9r7dOn-8IHJ0XOJJ4cA";

// Inventory sheet locations
var INVENTORY_SHEET = "inventory";
var RFID_COLUMN = "J";

// Search Sheet locations
var SEARCH_SHEET = "search";
var RFID_SEARCH_FIELD_RANGE = "search!B2";
var RFID_SEARCH_RESULT_RANGE = "search!C2:M2";

var ID_SEARCH_FIELD_RANGE = "search!B3";
var ID_SEARCH_RESULT_RANGE = "search!C3:M3";

var CURRENT_ROW_TO_TAG = "search!C4";
var CURRENT_ROW_TO_TAG_RANGE = "search!C4:M4";
var LAST_PLANT_ID = "search!B5";

// HID RFID reader
var VENDOR_ID = "1a86";
var PRODUCT_ID = "e010"
