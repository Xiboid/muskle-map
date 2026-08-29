# Muskle Network Map

An interactive, clustered map widget displaying the global network of students and professors for the Muskle Summer School. Built with MapLibre GL JS and continuously updated via a Python data pipeline connected to Google Sheets and the ROR API.

## 📂 Project Structure

* **`index.html`**: The main entry point to view and test the map locally.
* **`src/widget.js`**: The custom Web Component (`<muskle-map>`) handling the 3D map rendering, custom city-based clustering, and user interface logic.
* **`scripts/build_data.py`**: The data automation pipeline. It downloads the latest profiles from the published Google Sheet, fetches missing geographic data via the ROR API, and formats everything.
* **`data.json`**: The compiled dataset consumed by the map (generated automatically by the Python script).
* **`images/`**: Directory containing the profile photos referenced in the spreadsheet.