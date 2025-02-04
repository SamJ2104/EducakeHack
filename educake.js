(function() {
    let capturedHeaders = null;
    let authorizationToken = null;
    let quizId = window.location.href.match(/quiz\/(\d+)/)?.[1]; // Extract quizId from URL

    if (!quizId) {
        console.error("❌ Could not find Quiz ID in URL.");
        return;
    }

    function extractHeaders(headersObj) {
        let extracted = {};
        for (let [key, value] of Object.entries(headersObj)) {
            extracted[key.toLowerCase()] = value;
        }
        return extracted;
    }

    function fetchQuizAndQuestions() {
        if (!capturedHeaders || !authorizationToken) {
            console.error("❌ Headers or Authorization token not found!");
            return;
        }

        console.log("🔑 Using Authorization token:", authorizationToken);

        let quizUrl = `https://my.educake.co.uk/api/student/quiz/${quizId}`;
        fetch(quizUrl, {
            headers: {
                ...capturedHeaders,
                'Authorization': `Bearer ${authorizationToken}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (!data.attempt) {
                console.log("❌ No quiz attempt data found.");
                return;
            }

            console.log("📊 Attempt data:", data.attempt);

            let attempt = Object.values(data.attempt)[0];
            let questionIds = attempt.questions;

            console.log(`🔍 Found ${questionIds.length} questions.`);

            questionIds.forEach(questionId => {
                let questionUrl = `https://my.educake.co.uk/api/student/question/${questionId}`;
                fetch(questionUrl, {
                    headers: {
                        ...capturedHeaders,
                        'Authorization': `Bearer ${authorizationToken}`
                    }
                })
                .then(res => res.json())
                .then(questionData => {
                    let correctAnswers = questionData.answer?.correctAnswers || [];
                    console.log(`🎯 Question ID: ${questionId} Correct Answer(s):`, correctAnswers);
                })
                .catch(err => console.error(`❌ Error fetching question ${questionId}:`, err));
            });
        })
        .catch(err => console.error("❌ Quiz Fetch Error:", err));
    }

    function captureHeaders(headers) {
        if (!capturedHeaders) {
            capturedHeaders = extractHeaders(headers);
            console.log("🔑 Captured Headers:", capturedHeaders);
        }
        if (!authorizationToken && headers['authorization']) {
            authorizationToken = headers['authorization'].split(' ')[1]; // Extract Bearer token
            console.log("🔑 Captured Authorization Token:", authorizationToken);
        }

        // If both headers and token are captured, fetch quiz and questions
        if (capturedHeaders && authorizationToken) {
            fetchQuizAndQuestions();
        }
    }

    // Intercept fetch requests
    window.fetch = new Proxy(window.fetch, {
        apply: function(target, thisArg, args) {
            let [, options] = args;
            if (options?.headers) {
                console.log("🔍 Fetch request headers:", options.headers);
                captureHeaders(options.headers);
            }
            return target.apply(thisArg, args);
        }
    });

    // Intercept XHR requests
    let open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener("readystatechange", function() {
            if (this.readyState === 4 && !capturedHeaders) {
                let responseHeaders = this.getAllResponseHeaders().split("\r\n");
                let headersObj = {};
                responseHeaders.forEach(header => {
                    let [key, value] = header.split(": ");
                    if (key && value) headersObj[key.toLowerCase()] = value;
                });

                console.log("🔍 XHR request headers:", headersObj);
                captureHeaders(headersObj);
            }
        });
        open.apply(this, arguments);
    };
})();
