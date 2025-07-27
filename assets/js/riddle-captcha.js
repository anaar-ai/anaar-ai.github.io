/**
 * Riddle Captcha Component
 * A captcha-like component that presents riddles to users before showing paid content
 *
 * Simple implementation:
 * <div data-riddle-captcha="YOUR_API_TOKEN"></div>
 *
 * Advanced implementation:
 * <div
 *   data-riddle-captcha="YOUR_API_TOKEN"
 *   data-protected-content="custom-content-id"
 *   data-time-limit="120"
 * ></div>
 */

class RiddleCaptcha {
    constructor(options = {}) {
        this.options = {
            containerId: null,
            contentId: 'protected-content',
            apiToken: null,
            apiEndpoint: '/.netlify/functions/get-riddle',
            verifyEndpoint: '/.netlify/functions/verify-answer',
            timeLimit: 60, // seconds
            ...options
        };

        this.container = document.getElementById(this.options.containerId);
        this.contentContainer = document.getElementById(this.options.contentId);
        this.currentRiddle = null;
        this.timer = null;
        this.timeRemaining = this.options.timeLimit;

        // Sample riddles for demo (replace with API call in production)
        this.sampleRiddles = [
            {
                id: 1,
                question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
                answer: "echo",
                difficulty: "medium"
            },
            {
                id: 2,
                question: "What has keys but no locks, space but no room, and you can enter but not go in?",
                answer: "keyboard",
                difficulty: "medium"
            },
            {
                id: 3,
                question: "The more you take, the more you leave behind. What am I?",
                answer: "footsteps",
                difficulty: "medium"
            },
            {
                id: 4,
                question: "What has a head, a tail, is brown, and has no legs?",
                answer: "penny",
                difficulty: "medium"
            },
            {
                id: 5,
                question: "What gets wetter as it dries?",
                answer: "towel",
                difficulty: "easy"
            }
        ];

        if (this.container && this.contentContainer) {
            this.init();
        } else {
            console.error('Riddle Captcha: Container or content element not found');
        }
    }

    init() {
        // Hide the protected content initially
        this.contentContainer.style.display = 'none';

        // Create captcha UI
        this.createCaptchaUI();

        // Load a riddle
        this.loadRiddle();
    }

    createCaptchaUI() {
        this.container.innerHTML = `
            <div class="riddle-captcha">
                <div class="riddle-captcha__header">
                    <h3>Verify you're human</h3>
                    <p>Solve this riddle to access the content</p>
                </div>
                <div class="riddle-captcha__body">
                    <div class="riddle-captcha__question" id="riddle-question"></div>
                    <div class="riddle-captcha__input-container">
                        <input type="text" id="riddle-answer" class="riddle-captcha__input" placeholder="Your answer">
                        <button id="riddle-submit" class="riddle-captcha__submit btn">Submit</button>
                    </div>
                    <div class="riddle-captcha__timer" id="riddle-timer"></div>
                    <div class="riddle-captcha__message" id="riddle-message"></div>
                </div>
                <div class="riddle-captcha__footer">
                    <button id="riddle-refresh" class="riddle-captcha__refresh">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                        New Riddle
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('riddle-submit').addEventListener('click', () => this.checkAnswer());
        document.getElementById('riddle-refresh').addEventListener('click', () => this.loadRiddle());
        document.getElementById('riddle-answer').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.checkAnswer();
            }
        });
    }

    async loadRiddle() {
        try {
            // Show loading state
            document.getElementById('riddle-question').textContent = 'Loading riddle...';

            let riddle;

            try {
                // Try to fetch from API with the API token
                const url = new URL(this.options.apiEndpoint, window.location.origin);
                if (this.options.apiToken) {
                    url.searchParams.append('token', this.options.apiToken);
                }

                const response = await fetch(url);
                const data = await response.json();
                riddle = data.riddle;
            } catch (apiError) {
                console.warn('API fetch failed, using fallback riddles:', apiError);
                // Fallback to sample riddles if API fails
                riddle = this.sampleRiddles[Math.floor(Math.random() * this.sampleRiddles.length)];
                // Create a hash for the answer for consistency with API
                riddle.answerHash = btoa(riddle.answer.toLowerCase());
                delete riddle.answer; // Remove the answer for security
            }

            // Store the current riddle
            this.currentRiddle = riddle;

            // Display the riddle
            document.getElementById('riddle-question').textContent = this.currentRiddle.question;
            document.getElementById('riddle-answer').value = '';
            document.getElementById('riddle-message').textContent = '';
            document.getElementById('riddle-message').className = 'riddle-captcha__message';

            // Reset and start timer
            this.resetTimer();
            this.startTimer();

        } catch (error) {
            console.error('Error loading riddle:', error);
            document.getElementById('riddle-question').textContent = 'Error loading riddle. Please try again.';
        }
    }

    async checkAnswer() {
        const userAnswer = document.getElementById('riddle-answer').value.trim();

        if (!userAnswer) {
            return; // Don't submit empty answers
        }

        try {
            // Disable the submit button and show loading state
            const submitButton = document.getElementById('riddle-submit');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Checking...';

            let isCorrect;

            try {
                // Try to verify with API
                const response = await fetch(this.options.verifyEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        riddleId: this.currentRiddle.id,
                        userAnswer: userAnswer,
                        answerHash: this.currentRiddle.answerHash,
                        apiToken: this.options.apiToken
                    })
                });

                const data = await response.json();
                isCorrect = data.success;

                // Store the access token if provided
                if (data.accessToken) {
                    sessionStorage.setItem('riddleAccessToken', data.accessToken);
                }

            } catch (apiError) {
                console.warn('API verification failed, using fallback verification:', apiError);

                // Fallback verification if API fails
                // Decode the base64 hash to get the answer
                const correctAnswer = atob(this.currentRiddle.answerHash).toLowerCase();
                isCorrect = userAnswer.toLowerCase() === correctAnswer;
            }

            // Re-enable the submit button
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;

            if (isCorrect) {
                this.showSuccess();
            } else {
                this.showError();
            }

        } catch (error) {
            console.error('Error checking answer:', error);

            // Re-enable the submit button
            const submitButton = document.getElementById('riddle-submit');
            submitButton.disabled = false;
            submitButton.textContent = 'Submit';

            // Show error message
            const messageEl = document.getElementById('riddle-message');
            messageEl.textContent = 'Error checking answer. Please try again.';
            messageEl.className = 'riddle-captcha__message riddle-captcha__message--error';
        }
    }

    showSuccess() {
        // Stop the timer
        this.stopTimer();

        // Show success message
        const messageEl = document.getElementById('riddle-message');
        messageEl.textContent = 'Correct! Unlocking content...';
        messageEl.className = 'riddle-captcha__message riddle-captcha__message--success';

        // Show the protected content after a short delay
        setTimeout(() => {
            // Hide the captcha container
            this.container.style.display = 'none';

            // Show the protected content
            this.contentContainer.style.display = 'block';

            // Remove the gradient overlay from article preview
            const articlePreview = document.querySelector('.article-preview');
            if (articlePreview) {
                // Remove the max-height limitation
                articlePreview.style.maxHeight = 'none';

                // Remove the ::after pseudo-element by adding a class
                articlePreview.classList.add('no-gradient');
            }

            // Store in session that user has completed captcha
            sessionStorage.setItem('riddleCaptchaCompleted', 'true');
        }, 1500);
    }

    showError() {
        const messageEl = document.getElementById('riddle-message');
        messageEl.textContent = 'Incorrect answer. Please try again.';
        messageEl.className = 'riddle-captcha__message riddle-captcha__message--error';

        // Clear the input
        document.getElementById('riddle-answer').value = '';
        document.getElementById('riddle-answer').focus();
    }

    startTimer() {
        this.timeRemaining = this.options.timeLimit;
        this.updateTimerDisplay();

        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.stopTimer();
                this.loadRiddle(); // Load a new riddle when time expires
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    resetTimer() {
        this.stopTimer();
        this.timeRemaining = this.options.timeLimit;
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const timerEl = document.getElementById('riddle-timer');
        timerEl.textContent = formattedTime;

        // Add warning class when time is running low
        if (this.timeRemaining <= 10) {
            timerEl.className = 'riddle-captcha__timer riddle-captcha__timer--warning';
        } else {
            timerEl.className = 'riddle-captcha__timer';
        }
    }

    // Check if user has already completed captcha in this session
    static checkPreviousCompletion() {
        return false;
        // return sessionStorage.getItem('riddleCaptchaCompleted') === 'true';
    }

    // Reset the completion status (e.g., for testing)
    static resetCompletion() {
        sessionStorage.removeItem('riddleCaptchaCompleted');
    }
}

// Auto-initialize if data attributes are present
document.addEventListener('DOMContentLoaded', () => {
    // Check if user has already completed captcha
    if (RiddleCaptcha.checkPreviousCompletion()) {
        const defaultContentId = 'protected-content';
        const content = document.getElementById(defaultContentId);

        if (content) {
            // Hide captcha containers
            const captchaContainers = document.querySelectorAll('[data-riddle-captcha]');
            captchaContainers.forEach(container => {
                container.style.display = 'none';
            });

            // Show protected content
            content.style.display = 'block';

            // Remove the gradient overlay from article preview
            const articlePreview = document.querySelector('.article-preview');
            if (articlePreview) {
                // Remove the max-height limitation
                articlePreview.style.maxHeight = 'none';

                // Remove the ::after pseudo-element by adding a class
                articlePreview.classList.add('no-gradient');
            }
        }
        return;
    }

    // Otherwise initialize the captcha
    const captchaContainers = document.querySelectorAll('[data-riddle-captcha]');
    captchaContainers.forEach(container => {
        // Get API token from the data attribute value
        const apiToken = container.getAttribute('data-riddle-captcha');

        // Set a default ID if none exists
        if (!container.id) {
            container.id = 'riddle-captcha-' + Math.random().toString(36).substring(2, 9);
        }

        const options = {
            containerId: container.id,
            contentId: container.dataset.protectedContent || 'protected-content',
            timeLimit: parseInt(container.dataset.timeLimit) || 60,
            apiToken: apiToken || null
        };

        new RiddleCaptcha(options);
    });
});
