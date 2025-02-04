(async function(){
    // Get the authorization token from sessionStorage
    let authToken = sessionStorage.getItem("token");

    // Function to get XSRF-TOKEN from cookies
    function getXsrfToken() {
        let match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : null;
    }
    let xsrfToken = getXsrfToken();

    if (!authToken) {
        alert("Authorization token not found in sessionStorage. Ensure you're logged in.");
        return;
    }

    if (!xsrfToken) {
        alert("XSRF token not found in cookies. Ensure you're logged in.");
        return;
    }

    // Extract Quiz ID from URL
    let match = window.location.pathname.match(/quiz\/(\d+)/);
    if (!match) {
        alert("Quiz ID not found in the URL.");
        return;
    }
    let quizId = match[1];

    console.log("Quiz ID:", quizId);
    console.log("Using Auth Token:", authToken);
    console.log("Using XSRF Token:", xsrfToken);

    try {
        // Fetch quiz data
        let quizResponse = await fetch(`https://my.educake.co.uk/api/student/quiz/${quizId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json;version=2',
                'Authorization': `Bearer ${authToken}`,
                'X-XSRF-TOKEN': xsrfToken
            }
        });

        if (!quizResponse.ok) throw new Error("Failed to fetch quiz data.");

        let quizData = await quizResponse.json();

        // Extract question IDs
        let questionIds = quizData.attempt[quizId].questions;
        console.log("Found Question IDs:", questionIds);

        let answers = [];

        // Fetch correct answers for each question
        for (let questionId of questionIds) {
            try {
                let response = await fetch(`https://my.educake.co.uk/api/course/question/${questionId}/mark`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json;version=2',
                        'Authorization': `Bearer ${authToken}`,
                        'X-XSRF-TOKEN': xsrfToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ "givenAnswer": "1" }) // Dummy answer to get correct answer
                });

                let data = await response.json();

                // Check if response contains the correct answer
                if (data.answer && data.answer.correctAnswers) {
                    let correctAnswer = data.answer.correctAnswers.join(", ");
                    answers.push({ questionId, correctAnswer });
                    console.log(`Question ${questionId} - Correct Answer: ${correctAnswer}`);
                } else {
                    console.log(`Question ${questionId} - No correct answer found.`);
                }
            } catch (error) {
                console.error(`Error submitting question ${questionId}:`, error);
            }
        }

        // Encode answers as Base64 JSON
        let encodedAnswers = btoa(JSON.stringify(answers));

        // Open new tab with encoded answers
        let newTabUrl = `https://educake.samj.app/?answers=${encodedAnswers}`;
        window.open(newTabUrl, "_blank");

    } catch (error) {
        console.error("Error:", error);
    }
})();
