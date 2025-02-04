(async function() {
    // Store the headers
    let dynamicHeaders = {};

    // Function to intercept and log requests with Authorization header
    const interceptRequests = (url, options) => {
        // Check if Authorization header exists in the request
        if (options?.headers?.authorization) {
            dynamicHeaders = options.headers; // Store headers for later use
            console.log("Authorization header found:", dynamicHeaders);
            return true;
        }
        return false;
    };

    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
        // Check and capture headers when Authorization is found
        if (interceptRequests(url, options)) {
            // Stop intercepting fetch requests once Authorization is found
            window.fetch = originalFetch;
        }

        return originalFetch.apply(this, arguments);
    };

    // Intercept XMLHttpRequest (for older API requests)
    const originalXHR = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        const self = this;
        this.addEventListener("readystatechange", function() {
            if (this.readyState === 4) {
                // Check if the response contains the Authorization header
                const responseHeaders = this.getAllResponseHeaders();
                if (responseHeaders.includes("Authorization")) {
                    dynamicHeaders = this.getResponseHeader("Authorization");
                    console.log("Authorization header found in XHR response:", dynamicHeaders);

                    // Stop intercepting XHR requests once Authorization is found
                    XMLHttpRequest.prototype.open = originalXHR;
                }
            }
        });
        originalXHR.apply(this, arguments);
    };

    // Extract QUIZID from the URL
    let match = window.location.pathname.match(/quiz\/(\d+)/);
    if (!match) {
        alert("Quiz ID not found in the URL.");
        return;
    }
    let quizId = match[1];

    try {
        // Wait for the headers to be captured from the first request
        await new Promise(resolve => setTimeout(resolve, 1000));  // Adjust wait time if necessary

        if (!dynamicHeaders.authorization) {
            alert("Authorization token not found. Make sure you've made a request first.");
            return;
        }

        // Fetch quiz data using the dynamic headers
        let quizResponse = await fetch(`https://my.educake.co.uk/api/student/quiz/${quizId}`, {
            method: 'GET',
            headers: dynamicHeaders
        });

        if (!quizResponse.ok) throw new Error("Failed to fetch quiz data.");

        let quizData = await quizResponse.json();
        let attempt = Object.values(quizData.attempt)[0]; // Get first attempt object
        if (!attempt || !attempt.questions) {
            alert("No questions found in the quiz.");
            return;
        }

        let questionIds = attempt.questions;
        console.log(`Found ${questionIds.length} questions. Fetching correct answers...`);

        // Send requests for each question using the dynamic headers
        for (let questionId of questionIds) {
            try {
                let questionResponse = await fetch(`https://my.educake.co.uk/api/course/question/${questionId}/mark`, {
                    method: 'POST',
                    headers: dynamicHeaders,
                    body: JSON.stringify({"givenAnswer": "1"})
                });

                let data = await questionResponse.json();

                // Check if response contains the correct answer
                if (data.answer && data.answer.correctAnswers) {
                    console.log(`Question ${questionId} - Correct Answer:`, data.answer.correctAnswers.join(", "));
                } else {
                    console.log(`Question ${questionId} - No correct answer found in response.`);
                }
            } catch (error) {
                console.error(`Error submitting question ${questionId}:`, error);
            }
        }

        alert("All requests sent. Check console for correct answers.");
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred. Check the console.");
    }
})();
