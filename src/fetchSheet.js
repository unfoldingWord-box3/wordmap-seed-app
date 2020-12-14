function fetchSheet({ id, sheet, store }) {
    loadStatus = "Loading data...";
    const url = `https://spreadsheets.google.com/feeds/list/${id}/${sheet}/public/values?alt=json`;
    fetch(url).then((response) => response.json())
        .then((data) => {
            store.set(data);
            console.log(`Sheet: ${sheet} of WorkbookId: ${id}`);
            loadStatus = "Data loaded";
        }).catch((error) => {
            loadStatus = "There was a problem loading data. See the console.";
            console.error(error);
        });
};