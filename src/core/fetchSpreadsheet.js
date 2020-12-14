function fetchSheet({ id, sheet, store, onStatus }) {
    onStatus("Loading data...");
    const url = `https://spreadsheets.google.com/feeds/list/${id}/${sheet}/public/values?alt=json`;
    fetch(url)
        .then((response) => response.json())
        .then((data) => {
            store.set(data);
            onStatus("Data loaded");
        })
        .catch((error) => {
            onStatus("There was a problem loading data. See the console.");
            console.error(error);
        });
};

export default fetchSheet;