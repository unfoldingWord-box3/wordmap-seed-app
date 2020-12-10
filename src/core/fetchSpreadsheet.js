const fetchSpreadsheet = async (spreadsheetId) => {
  console.log("fetching...");
  const response = await fetch(
    `https://spreadsheets.google.com/feeds/list/${spreadsheetId}/1/public/values?alt=json`, { mode: "no-cors" }
  );
  return response.json();
};

export default fetchSpreadsheet;
