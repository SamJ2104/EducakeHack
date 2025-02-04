(async function() {
    // Extract QUIZID from the URL
    let match = window.location.pathname.match(/quiz\/(\d+)/);
    if (!match) {
        alert("Quiz ID not found in the URL.");
        return;
    }
    let quizId = match[1];

    try {
        // Function to capture the headers from previous requests
        async function fetchWithHeaders(url, options) {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error("Request failed");
            }
            const responseHeaders = response.headers;

            // Store headers for later requests
            const headers = {
                'accept': responseHeaders.get('accept') || 'application/json;version=2',
                'accept-language': responseHeaders.get('accept-language') || 'en-GB,en-US;q=0.9,en;q=0.8',
                'authorization': responseHeaders.get('authorization') || '',  // Authorization token
                'cache-control': responseHeaders.get('cache-control') || 'no-cache',
                'cookie': responseHeaders.get('cookie') || '',
                'user-agent': responseHeaders.get('user-agent') || 'Mozilla/5.0',
                'x-xsrf-token': responseHeaders.get('x-xsrf-token') || ''
            };

            return {
                headers,
                json: await response.json()
            };
        }

        // Fetch quiz data using dynamically captured headers
        let quizResponseData = await fetchWithHeaders(`https://my.educake.co.uk/api/student/quiz/${quizId}`, {
            method: 'GET'
        });

        let quizData = quizResponseData.json;
        let attempt = Object.values(quizData.attempt)[0]; // Get first attempt object
        if (!attempt || !attempt.questions) {
            alert("No questions found in the quiz.");
            return;
        }

        let questionIds = attempt.questions;
        console.log(`Found ${questionIds.length} questions. Fetching correct answers...`);

        // Send requests for each question using dynamic headers
        for (let questionId of questionIds) {
            try {
                let questionResponseData = await fetchWithHeaders(`https://my.educake.co.uk/api/course/question/${questionId}/mark`, {
                    method: 'POST',
                    headers: quizResponseData.headers,
                    body: JSON.stringify({"givenAnswer": "1"})
                });

                let data = questionResponseData.json;

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
