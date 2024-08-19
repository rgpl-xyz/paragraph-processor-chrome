const checkbox = document.getElementById("useNLP") as HTMLInputElement;

// Load the stored value
chrome.storage.sync.get("useNLP", (data) => {
  if (chrome.runtime.lastError) {
    console.error("Error retrieving useNLP:", chrome.runtime.lastError);
  }
  checkbox.checked = data.useNLP || false;
});

// Save the value when it changes
checkbox.addEventListener("change", () => {
  chrome.storage.sync.set({ useNLP: checkbox.checked }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving useNLP:", chrome.runtime.lastError);
    }
  });
});
