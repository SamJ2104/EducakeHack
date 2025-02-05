(async function() {
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
        alert("make sure you're on the quiz page");
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

        // Create "Show Answers" button (smaller, black background)
        let showAnswersButton = document.createElement('div');
        showAnswersButton.innerText = 'Show Answers';
        showAnswersButton.style.position = 'fixed';
        showAnswersButton.style.top = '10px';
        showAnswersButton.style.left = '10px';
        showAnswersButton.style.width = '75px'; // Smaller size
        showAnswersButton.style.height = '75px'; // Smaller size
        showAnswersButton.style.border = '2px solid green';
        showAnswersButton.style.borderRadius = '50%';
        showAnswersButton.style.backgroundColor = 'black'; // Black background
        showAnswersButton.style.color = 'green';
        showAnswersButton.style.display = 'flex';
        showAnswersButton.style.alignItems = 'center';
        showAnswersButton.style.justifyContent = 'center';
        showAnswersButton.style.textAlign = 'center';
        showAnswersButton.style.fontWeight = 'bold';
        showAnswersButton.style.fontSize = '14px';
        showAnswersButton.style.cursor = 'pointer';
        showAnswersButton.style.zIndex = '9999';

        // Create iframe (hidden initially)
        let iframe = document.createElement('iframe');
        iframe.src = `https://educake.samj.app/?answers=${encodedAnswers}`;
        iframe.style.position = 'absolute';
        iframe.style.top = '10px';
        iframe.style.left = '10px';
        iframe.style.width = '300px';  // Portrait style (taller than wide)
        iframe.style.height = '500px'; // Portrait style (taller than wide)
        iframe.style.border = '2px solid green';
        iframe.style.borderRadius = '8px';
        iframe.style.zIndex = '9999';
        iframe.style.boxShadow = '0px 4px 10px rgba(0, 0, 0, 0.1)';
        iframe.style.display = 'none';  // Hidden by default

        // Create "Hide Answers" link (relative to iframe)
        let hideAnswersLink = document.createElement('a');
        hideAnswersLink.href = '#';
        hideAnswersLink.innerText = 'Hide Answers';
        hideAnswersLink.style.position = 'absolute';
        hideAnswersLink.style.top = '20px'; // below the iframe
        hideAnswersLink.style.left = '20px';  // Slightly left
        hideAnswersLink.style.color = 'green';
        hideAnswersLink.style.textDecoration = 'underline';
        hideAnswersLink.style.fontSize = '14px';
        hideAnswersLink.style.zIndex = '99999'; // more than iframe
        hideAnswersLink.style.display = 'none';  // Hidden initially
        hideAnswersLink.addEventListener('click', () => {
            iframe.style.display = 'none';
            iframeContainer.style.display = 'none';  // Hide the container along with iframe
            showAnswersButton.style.display = 'flex';  // Show the button again
            hideAnswersLink.style.display = 'none';  // Hide the link again
        });

        // Create container div for iframe and the hide button (larger hitbox area)
        let iframeContainer = document.createElement('div');
        iframeContainer.style.position = 'absolute';
        iframeContainer.style.top = '10px';
        iframeContainer.style.left = '10px';
        iframeContainer.style.zIndex = '9999';
        iframeContainer.style.width = '330px';  // Increased width for larger hitbox
        iframeContainer.style.height = '550px'; // Increased height for larger hitbox
        iframeContainer.style.cursor = 'move';  // Change cursor to move to indicate drag
        iframeContainer.style.display = 'none';  // Hidden by default
        iframeContainer.appendChild(iframe);
        iframeContainer.appendChild(hideAnswersLink);

        // Check screen size and adjust container and iframe size for mobile
        function adjustForMobile() {
            if (window.innerWidth <= 768) {
                iframeContainer.style.width = '165px';  // Half width for mobile
                iframeContainer.style.height = '275px'; // Half height for mobile
                iframe.style.width = '165px';  // Adjust iframe width
                iframe.style.height = '275px'; // Adjust iframe height
            } else {
                iframeContainer.style.width = '330px';  // Normal width for desktop
                iframeContainer.style.height = '550px'; // Normal height for desktop
                iframe.style.width = '300px';  // Adjust iframe width
                iframe.style.height = '500px'; // Adjust iframe height
            }
        }

        // Call the function to adjust size on page load
        adjustForMobile();

        // Add resize event listener to adjust size dynamically when window resizes
        window.addEventListener('resize', adjustForMobile);

        // Toggle iframe visibility when button is clicked
        showAnswersButton.addEventListener('click', () => {
            iframe.style.display = 'block';
            iframeContainer.style.display = 'block';  // Show the container and iframe
            showAnswersButton.style.display = 'none';  // Hide the button
            hideAnswersLink.style.display = 'block';  // Show Hide Answers button
        });

        // Add elements to the document body
        document.body.appendChild(showAnswersButton);
        document.body.appendChild(iframeContainer);

        // Make the iframe and button draggable with larger hitbox
        let isDragging = false;
        let offsetX, offsetY;

        iframeContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - iframeContainer.offsetLeft;
            offsetY = e.clientY - iframeContainer.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                iframeContainer.style.left = `${e.clientX - offsetX}px`;
                iframeContainer.style.top = `${e.clientY - offsetY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        iframe.style.resize = 'both';
        iframe.style.overflow = 'auto';

    } catch (error) {
        console.error("Error:", error);
    }
})();
