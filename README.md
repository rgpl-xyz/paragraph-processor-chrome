# Chrome Extension with NLP API Integration

This project is a Chrome extension that processes text from paragraphs on web pages using Natural Language Processing (NLP). It extracts noun phrases from the text and highlights them dynamically using a shadow DOM.

## Features

- **Dynamic Text Processing**: Automatically attaches shadow DOM to paragraphs on web pages and highlights extracted noun phrases.
- **NLP API Integration**: Communicates with an NLP API to fetch noun phrases for highlighting.
- **Custom User Settings**: Provides users with a toggle to enable or disable NLP processing.
- **Persistent Storage**: Saves user preferences using Chrome's `chrome.storage.sync`.

## Setup

### Prerequisites

- Ensure you have Chrome installed and that you can load unpacked extensions.
- (Optional) The backend NLP API should be running at [http://localhost:8000](http://localhost:8000). It should have a `/noun_phrases` endpoint that accepts a POST request with text data and responds with noun phrases.

### Installation

1. Clone these repositories:

    ```bash
    git clone https://github.com/rgpl-xyz/paragraph.counter.git
    cd paragraph.counter
    npm run build # generates a ./dist folder

     # optional backend
    git clone https://github.com/rgpl-xyz/rgpl-spacy-api.git
    # refer to the repository's ReadMe on how to start the backend
    ```

2. Load the extension in Chrome:

    - Open `chrome://extensions/` in Chrome.
    - Enable "Developer mode".
    - Click "Load unpacked" and select the **./dist** extension directory.
    - Check or uncheck the `Use NLP to highlight nouns` checkbox to use or disable the NLP API

3. (Optional) Start the backend NLP server (rgpl-spacy-api assumed to be running locally)

## Files Overview

### `popup.ts`

The popup script is responsible for managing the user interface of the extension's popup. It includes a toggle (`useNLP`) for enabling or disabling the NLP functionality. The user’s preference is saved in `chrome.storage.sync`.

### `background.ts`

The background script listens for messages from the content script and forwards the text to the NLP API. This script manages the communication between the extension and the backend service.

### `content.ts`

This script dynamically attaches shadow DOM to paragraphs on the page and uses NLP to highlight noun phrases. It processes the text content of paragraphs and updates the UI accordingly.

## Contributing

### Contributions are welcome! To contribute to the project:
- Submit Pull Requests: Fork the repository, make your changes, and submit a pull request. Ensure that your changes are well-documented and tested.
- Report Issues: If you encounter bugs or have suggestions for improvements, report them on the GitHub Issues page.

## License

This project is licensed under the [GNU General Public License v3.0 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0.html). You can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

### License Details

- **Freedom to Use**: You can use this software for any purpose.
- **Freedom to Study and Modify**: You can study how the program works, and change it to make it do what you wish.
- **Freedom to Distribute Copies**: You can redistribute copies of the original program so you can help others.
- **Freedom to Distribute Modified Versions**: You can distribute copies of your modified versions to others. By doing this you can give the whole community a chance to benefit from your changes. Access to the source code is a precondition for this.

### How to Obtain a Copy

You should have received a copy of the GNU General Public License along with this program. If not, you can obtain it from the [Free Software Foundation](https://www.gnu.org/licenses/gpl-3.0.html).

### Further Information

For more details on the GNU General Public License and its terms, visit the [GNU General Public License webpage](https://www.gnu.org/licenses/gpl-3.0.html).

