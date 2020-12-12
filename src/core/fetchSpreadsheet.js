function fetchSheet({id, sheet, store, status}) {
  status = "Loading data...";
  const url = `https://spreadsheets.google.com/feeds/list/${id}/${sheet}/public/values?alt=json`;
  fetch( url )
  .then((response) => response.json())
  .then((data) => {
    store.set(data);
    status = "Data loaded";
  })
  .catch((error) => {
    status = "There was a problem loading data. See the console.";
    console.error(error);
  });
};

export default fetchSheet;
