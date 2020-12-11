For each todo-item that is completed, please replace the `-`or `*` with a `+` and move the item to the end of its list.

A todo-item that starts with a question mark needs clarification or a decision on whether to implement it.

Within each list, sort the items by their priority.


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
- ? Add backtranslations as well
- ? Get multiple suggestions from Google translate


# UI
- Allow selecting a verse (from say 5 hardcoded verses, or based on a spreadsheet)
- ? Use larger texts than verses
- Adapt the height of the source and target inputs to fit the text
- For both corpus and alignment: multiselect with options: Empty, 1-grams, 2-grams, 3-grams, 4-grams, 5-grams, ULT-chunks
- For corpus: include verse, include book, ? include other translations
- Save button that stores which fields of the form are selected for re-use in the same session (not persistent)
- Filter the alignment memory to only show terms actually occurring in the source text
- Click on a suggestion to add it to the alignment memory (meaning it is correct)
- Indicate when data is being fetched from a SpreadSheet
+ Unaligned text shows up at the bottom rather than the top of the suggestion
+ Switch target and source

# Quirks
- Is this `alignment: predictedAlignment?.cachedKey.replace(/n:/g,''),` an error? `/n:/ -> /:/` makes 'an apostle' -> aapostle
- ! Why does English to French remove so many of the French words?
- ? Plug in Proskomma
- ? Plug in tailwindcss


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


