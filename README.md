
# Loco Data Summary App - User Guide

Hello! This guide is to help you understand and make simple changes to your web application, even without development experience.

This application is built with React and TypeScript and fetches data directly from your public Google Sheet. It's designed to be a "frontend-only" application, which means it doesn't need a traditional backend or database, making it free to host on services like Vercel or Netlify.

---

### How to Make Changes

All the core settings you might want to change are located in a single file to make things easy: `constants.ts`.

#### 1. Changing the Google Sheet

If you want to use a different Google Sheet:
1.  Open the file `constants.ts`.
2.  Find the line `export const SPREADSHEET_ID = '...';`.
3.  Replace the existing ID `'1oVY3a7LrG4zn2oVkW88bi31uZqGdw_mb-YHk2-NVqKQ'` with the ID of your new sheet. You can find the ID in your sheet's URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.
4.  **IMPORTANT**: Your new sheet must be publicly accessible. In Google Sheets, click the `Share` button in the top right, and under `General access`, set it to `Anyone with the link`.

#### 2. Changing Sheet Names

The app identifies sheets by their exact name (the name of the tab).
1.  Open `constants.ts`.
2.  Look for the `SHEET_NAMES` object.
3.  If you rename a sheet in your Google document, you must update the name here. For example, if you rename the `Loco_list` sheet to `Master List`, you must change `Loco_list: 'Loco_list'` to `Loco_list: 'Master List'`. The part on the left of the colon (`Loco_list:`) should not be changed.

#### 3. Changing Columns to Display

You can easily change which columns appear in the tables.
1.  Open `constants.ts`.
2.  Find `LOCO_SCHEDULES_COLUMNS`.
3.  This list contains objects with `key` and `header`.
    *   `key`: This is the exact column header from your Google Sheet, but in **lowercase and without spaces**. For example, "Incoming Date" becomes `incomingdate`. This MUST match the sheet.
    *   `header`: This is the text that will be displayed in the app's table header (e.g., "Incoming Date").
4.  You can add, remove, or reorder the items in these lists to change the tables in the app.

#### 4. Linking Failure Reports

You can link individual failure records to external documents (like a Google Doc or PDF).
1.  Open your Google Sheet and go to the **`Traction_failures`** sheet.
2.  Add a new column with the exact header: `Document Link`.
3.  In this new column, paste the full URL for the document corresponding to that failure.
4.  The app will automatically detect these links and show a clickable icon, which will open the link in a new tab.

---

### Enabling Editing of Failure Records (Requires Setup)

This app includes a feature that allows authorized users to edit the "Cause of Failure" for records directly from the UI. This requires a simple backend script hosted in your Google Sheet.

#### Step 1: Add the Script to your Google Sheet
1.  Open your Google Sheet.
2.  Go to **Extensions > Apps Script**.
3.  A new browser tab will open with the script editor. Delete any existing code in the `Code.gs` file.
4.  Copy the entire script from the `google-apps-script.js` file in this project and paste it into the `Code.gs` file.
5.  **Configure the script**:
    *   Find the `CONFIGURATION` section at the top of the script.
    *   Verify that `SPREADSHEET_ID` and `GOOGLE_CLIENT_ID` match the values in your `constants.ts` file.
    *   In the `AUTHORIZED_USERS` list, add the Google email addresses of everyone who should have permission to edit records.
    *   Verify that `WAG7_FAILURES_SHEET` and `WDG4_FAILURES_SHEET` match the sheet names in your `constants.ts` file.
6.  Click the **Save project** icon (floppy disk).

#### Step 2: Deploy the Script as a Web App
1.  In the Apps Script editor, click the blue **Deploy** button in the top right.
2.  Select **New deployment**.
3.  Click the gear icon next to "Select type" and choose **Web app**.
4.  Under "Configuration":
    *   Give it a description, e.g., "Loco Data Editor v1".
    *   For "Execute as", select **Me (your Google account)**.
    *   For "Who has access", select **Anyone**. This is important for the app to be able to call the script.
5.  Click **Deploy**.
6.  Google will ask you to authorize the script. Click **Authorize access** and follow the prompts to allow the script to manage your spreadsheets.
7.  After deploying, a "Deployment successfully created" dialog will appear. **Copy the Web app URL**.

#### Step 3: Connect the Frontend to the Script
1.  Go back to your project code and open the `constants.ts` file.
2.  Find the `APPS_SCRIPT_URL` constant.
3.  Paste the Web app URL you copied into the quotes.
4.  Save the file.

After these steps, authorized users who sign into the app will see an edit icon next to recent failure records, and the changes they save will be updated in the Google Sheet and logged in a new "Edit_Log" sheet.

---

### How to Deploy (for free)

This type of project is very easy to deploy. The general steps are:
1.  **Push Code to GitHub**: Create a free GitHub account and upload the project files there to a new repository.
2.  **Choose a Host**: Sign up for a free account with a service like [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3.  **Import Project**: In Vercel or Netlify, choose to import a new project from your GitHub repository.
4.  **Deploy**: Follow the on-screen instructions. The services will automatically detect it's a React project and build/deploy it for you. Your site will be live on a public URL.

Whenever you make changes to the files and push them to GitHub, Vercel/Netlify will automatically redeploy the new version.

---

### Scope for Future Development

This app is a great start. If your needs grow, here are some ways it could be expanded:

1.  **Data Visualization**: Add more charts and graphs to visualize failure rates, component issues, or schedule frequencies.
2.  **Advanced Filtering**: Add filters to narrow down schedules or failures by date range, type of failure, etc.
3.  **Data Export**: Add a button to export the displayed data to a CSV file.
4.  **Backend/Database**: If the data in the Google Sheet becomes too large and slow to load, the next step would be to move the data into a proper database and build a simple backend API (e.g., using Python with Flask or FastAPI) to serve the data to the frontend. This would make the app much faster and more powerful.
