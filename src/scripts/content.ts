// Function to count words in a given text
function countWords(text: string) {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Function to create and return shadow DOM styles as a string
function createShadowStyles() {
  return `
    .shadow-container {
      position: absolute;
      top: 0;
      left: 0;
      margin-top: 0;
      border: 1px solid #ddd;
      padding: 5px;
      background-color: #f0f0f0;
      border-radius: 5px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      display: none;
      width: 100%;
      box-sizing: border-box;
      z-index: 1000;
    }

    .shadow-host {
      overflow: auto;
    }

    .shadow-content {
      color: #333;
      background-color: #c8c8c8;
      padding: 5px;
    }

    .action-container {
      position: relative;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      font-size: 12px;
      color: #212121;
      background-color: #fff;
    }

    .pushpin-button {
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 15px;
      margin-right: 5px;
      transform: rotate(45deg);
    }

    .word-counter {
      margin-right: 5px;
      display: none;
    }

    .action-title {
       margin-right: auto;
       margin-left: 5px;
    }
  `;
}

// Function to create and attach shadow DOM for each paragraph
function attachShadowToParagraphs() {
  const paragraphs = document.querySelectorAll<HTMLElement>("p:not([data-shadow-attached])");

  paragraphs.forEach(paragraph => {
    // Create a container for the shadow DOM content
    const shadowContainer = createShadowContainer(paragraph);

    // Create a shadow host
    const shadowHost = createShadowHost(paragraph);

    // Append shadowHost to shadowContainer
    shadowContainer.appendChild(shadowHost);

    // Attach shadow DOM to the shadow host
    const shadowRoot = shadowHost.attachShadow({ mode: "open" });

    // Create a style element for the Shadow DOM
    const style = document.createElement('style');
    style.textContent = createShadowStyles();
    shadowRoot.appendChild(style);

    // Create action title for the action container
    const actionTitle = createActionTitle();

    // Create a container for the action container
    const actionContainer = createActionContainer();

    // Create pushpin button
    const pushpinButton = createPushpinButton();

    // Create word counter element
    const wordCounter = createWordCounter(paragraph);

    let isPinned = false;

    // Toggle pinned state on click
    pushpinButton.addEventListener("click", () => {
      isPinned = !isPinned;
      
      if (isPinned) {
        shadowContainer.style.display = "block";
        wordCounter.style.display = "block";        
        pushpinButton.style.transform = "rotate(0deg) translate(0, -9%)";
      } else {
        shadowContainer.style.display = "none";
        wordCounter.style.display = "none";
        pushpinButton.style.transform = "rotate(45deg)"; // change "unpinned" icon
      }
    });

    // Append actions to actionContainer
    actionContainer.appendChild(actionTitle);
    actionContainer.appendChild(wordCounter);
    actionContainer.appendChild(pushpinButton);

    // Append actionContainer to shadowRoot
    shadowRoot.appendChild(actionContainer);

    // Add the "cloned" paragraph content to the shadow DOM
    const shadowContent = createParagraphShadowContent(paragraph);
    shadowRoot.appendChild(shadowContent);

    // Append shadowContainer to the paragraph
    paragraph.style.position = "relative";
    paragraph.appendChild(shadowContainer);

    // Add attribute to mark paragraph as processed
    paragraph.setAttribute("data-shadow-attached", "true");

    // Show shadowContainer on hover if not pinned
    paragraph.addEventListener("mouseover", () => {
      if (!isPinned) {
        shadowContainer.style.display = "block";
      }
    });

    // Hide shadowContainer when mouse leaves if not pinned
    paragraph.addEventListener("mouseout", () => {
      if (!isPinned) {
        shadowContainer.style.display = "none";
      }
    });
  });
}

// Attach shadow DOM to paragraphs immediately
attachShadowToParagraphs();

// Observe changes to attach shadow DOM dynamically
const observer = new MutationObserver(() => {
  // Only attach shadow DOM to new paragraphs (not already processed)
  attachShadowToParagraphs();
});

observer.observe(document.body, { childList: true, subtree: true });

function createActionContainer() {
  const actionContainer = document.createElement("div");
  actionContainer.classList.add("action-container");
  return actionContainer;
}

function createPushpinButton() {
  const pushpinButton = document.createElement("button");
  pushpinButton.classList.add("pushpin-button");
  pushpinButton.innerHTML = "📌";

  return pushpinButton;
}

function createActionTitle() {
  const actionTitle = document.createElement("span");
  actionTitle.classList.add("action-title");
  actionTitle.textContent = 'Pin to process text';

  return actionTitle;
}

function createWordCounter(paragraph: HTMLElement) {
  const wordCounter = document.createElement("span");
  wordCounter.classList.add("word-counter");

  const wordCount = countWords(paragraph.textContent || "");
  wordCounter.textContent = `Words: ${wordCount}`;

  return wordCounter;
}

function createParagraphShadowContent(paragraph: HTMLElement) {
  const shadowContent = document.createElement("div");
  shadowContent.classList.add("shadow-content");
  shadowContent.style.maxHeight = (paragraph.getClientRects()[0]?.height || 150) + "px";
  shadowContent.style.overflow = "auto";
  shadowContent.innerHTML = paragraph.innerHTML;

  return shadowContent;
}

function createShadowHost(paragraph: HTMLElement) {
  const shadowHost = document.createElement("div");
  shadowHost.classList.add("shadow-host");

  return shadowHost;
}

function createShadowContainer(paragraph: HTMLElement) {
  const shadowContainer = document.createElement("div");
  shadowContainer.classList.add("shadow-container");
  shadowContainer.style.position = "absolute";
  shadowContainer.style.top = "0";
  shadowContainer.style.left = "0";
  shadowContainer.style.marginTop = "0";
  shadowContainer.style.border = "1px solid #ddd";
  shadowContainer.style.padding = "5px";
  shadowContainer.style.backgroundColor = "#f0f0f0";
  shadowContainer.style.borderRadius = "5px";
  shadowContainer.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
  shadowContainer.style.display = "none"; // Hidden by default
  shadowContainer.style.zIndex = paragraph.style.zIndex + 1; // let's not get crazy with z-index
  shadowContainer.style.width = "100%";
  shadowContainer.style.boxSizing = "border-box";

  return shadowContainer;
}
