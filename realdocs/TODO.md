For each todo-item that is completed, please replace the `-`or `*` with a `+`.

A todo-item that starts with a question mark needs clarification or a decision on whether to implement it.

# Data
- Change the French translation to a more literal one
- Generate all base data:
    * select 5 verses
    * the entire book line by line per translation
    * unigram word-for-word per language Google translate
    * 2-gram word-for-word per language Google translate
    * 3-gram word-for-word per language Google translate
    * 4-gram word-for-word per language Google translate
    * 5-gram word-for-word per language Google translate
    * chunks per language Google translate 
- ? Enhance the data with synonyms


# UI
- Allow selecting a verse (from say 5 hardcoded verses, or based on a spreadsheet)
? Use large texts that verses
- Adapt the height of the source and target inputs to fit the text
- Switch target and source
- For both corpus and alignment: multiselect with options: Empty, 1-grams, 2-grams, 3-grams, 4-grams, 5-grams, ULT-chunks
- For corpus: include verse, include book, ? include other translations
- Save button that stores which fields of the form are selected for re-use in the same session (not persistent)
- Filter the alignment memory to only show terms actually occurring in the source text


# User story
The overall goal is to simplify alignment for untrained aligners by improving 
the suggestions based on an external source of data.

- Define the steps of exploring the effect of external data on the alignment
    * [no alignment] Align without a) corpus and b) without memory 
    * [base-alignment] Align with a) as corpus the text itself b) without memory
    * [base-book-alignment] Align with a) as corpus the entire book b) without memory
    * [mt-memory-alignment-1] Align with both as a corpus *and* as memory the unigrams extracted from Google translate
    * [mt-memory-alignment-1-5] Align with both as a corpus *and* as memory the 1-to-5grams extracted from Google translate
    * [chunked-mt-memory-alignment] Align with both as corpus *and* as memory the chunks of the aligned ULT extracted from Google translate
