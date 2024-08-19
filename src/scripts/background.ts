chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'fetchData') {

      const myHeaders = new Headers();
      myHeaders.append("Accept", "application/json");
      myHeaders.append("Accept-Encoding", "gzip, deflate, br, zstd");
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append("Sec-Fetch-Dest", "empty");
      myHeaders.append("Sec-Fetch-Mode", "cors");
      myHeaders.append("Sec-Fetch-Site", "same-origin");

      // Prepare the request body
      const requestBody = {
        values: [
          {
            recordId: "a1",
            data: {
              text: request.raw,  // Assuming the incoming request has raw text to process
              language: "en"
            }
          }
        ]
      };

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify(requestBody),
        redirect: "follow"
      } as RequestInit;

      // Fetch the noun phrases from the new endpoint
      fetch("http://localhost:8000/noun_phrases", requestOptions)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((result) => {
          console.log(result);
          // Respond with the fetched result
          sendResponse({ success: true, data: result });
        })
        .catch((error) => {
          console.error(error);
          // Respond with the error details
          sendResponse({ success: false, error: error.message });
        });

      // Keep the message channel open until `sendResponse` is called
      return true;
    }
});
