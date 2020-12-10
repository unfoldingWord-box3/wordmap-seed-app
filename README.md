# Transformers

We studied the **javascript framework svelte** and how it compares with our current react setup.

We are going to demonstrate how to *seed* wordmap with an automatically generated vocabulary list for an unaligned language by using svelte to edit and prepare the word list and inject said list into wordmap RCL.

This project is work in progress. It can be [viewed online](https://unfoldingword-box3.github.io/wordmap-seed-app/) using Github pages.

## A note on spreadsheets

In order to be able to retrieve a google sheet in this app, the sheet has to be 'published to the web'.
To do this for a given spreadsheet, navigate to `File` -> `Publish to Web` and click the `Publish` button.
This is not the same as making a sheet 'public' and is required for data retrieval.

## License

MIT


## Development

To install this app locally run the following four commands:

    git clone https://github.com/unfoldingWord-box3/wordmap-seed-app
    cd wordmap-seed-app
    npm install
    npm run dev

To display the app on Github page run:
    - moves the build to the docs folder (weird, but that's what Github pages likes)
    - makes links relative in index.html
