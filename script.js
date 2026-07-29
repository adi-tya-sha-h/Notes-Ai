document.addEventListener('DOMContentLoaded', () => {
    // Nav links active class toggling
    const navLinks = document.querySelectorAll('.nav-content a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Character counter for the textarea
    const textarea = document.querySelector('.app-body textarea');
    const charCountSpan = document.querySelector('.char-count');
    
    if (textarea && charCountSpan) {
        textarea.addEventListener('input', () => {
            const count = textarea.value.length;
            charCountSpan.textContent = `${count.toLocaleString()} character${count !== 1 ? 's' : ''}`;
        });
    }

    // Easter egg traffic lights functionality
    const redLight = document.querySelector('.red');
    const yellowLight = document.querySelector('.yellow');
    const greenLight = document.querySelector('.green');
    const navbar = document.querySelector('.navbar');

    if (redLight && navbar) {
        redLight.addEventListener('click', () => {
            // "Close" window by fading out the navbar
            navbar.style.opacity = '0';
            navbar.style.transform = 'translateY(-20px) scale(0.95)';
            navbar.style.pointerEvents = 'none';
            
            // Restore after 3 seconds
            setTimeout(() => {
                navbar.style.opacity = '';
                navbar.style.transform = '';
                navbar.style.pointerEvents = '';
            }, 3000);
        });
    }

    if (yellowLight && navbar) {
        yellowLight.addEventListener('click', () => {
            // "Minimize" navbar
            navbar.style.transform = 'scale(0.8) translateY(-10px)';
            setTimeout(() => {
                navbar.style.transform = '';
            }, 2000);
        });
    }

    if (greenLight && navbar) {
        greenLight.addEventListener('click', () => {
            // "Maximize" navbar width
            if (navbar.style.maxWidth === '100%') {
                navbar.style.maxWidth = '1100px';
                navbar.style.borderRadius = '14px';
            } else {
                navbar.style.maxWidth = '100%';
                navbar.style.borderRadius = '0px';
            }
        });
    }

    // === API GENERATOR INTEGRATION ===
    const generateBtn = document.getElementById('generate-btn');
    const notesCard = document.getElementById('notes-card');
    const notesContent = document.getElementById('notes-content');
    const quizCard = document.getElementById('quiz-card');
    const quizQuestions = document.getElementById('quiz-questions');
    const quizScore = document.getElementById('quiz-score');
    const submitQuizBtn = document.getElementById('submit-quiz-btn');
    const errorContainer = document.getElementById('error-container');

    let quizData = [];
    let userAnswers = {};

    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const rawText = textarea ? textarea.value.trim() : '';

            // Clear previous results & errors
            hideError();
            notesCard.classList.add('hidden');
            quizCard.classList.add('hidden');
            quizScore.classList.add('hidden');
            quizQuestions.innerHTML = '';
            notesContent.innerHTML = '';
            quizData = [];
            userAnswers = {};

            // Validation
            if (!rawText) {
                showError('Please paste some notes or study material first.');
                return;
            }
            const wordCount = rawText.split(/\s+/).filter(Boolean).length;
            if (wordCount < 100) {
                showError('Please enter at least 100 words to generate meaningful study aids.');
                return;
            }

            // Set Loading State
            setLoading(true);

            try {
                // Call endpoints in parallel
                const [notesResponse, quizResponse] = await Promise.all([
                    fetchNotes(rawText),
                    fetchQuiz(rawText)
                ]);

                // Render Notes
                if (notesResponse && notesResponse.notes) {
                    notesContent.innerHTML = parseMarkdown(notesResponse.notes);
                    notesCard.classList.remove('hidden');
                    // Smooth scroll to notes
                    notesCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    throw new Error('Invalid notes response structure from server.');
                }

                // Render Quiz
                if (quizResponse && quizResponse.quiz) {
                    quizData = quizResponse.quiz;
                    renderQuiz(quizData);
                    quizCard.classList.remove('hidden');
                } else {
                    throw new Error('Invalid quiz response structure from server.');
                }

            } catch (err) {
                console.error(err);
                showError(err.message || 'An error occurred while generating study resources. Make sure your server is running and API key is set.');
            } finally {
                setLoading(false);
            }
        });
    }

    // Helper: Set Loading State
    function setLoading(isLoading) {
        if (!generateBtn) return;
        const btnText = generateBtn.querySelector('span');
        if (isLoading) {
            generateBtn.classList.add('loading');
            if (btnText) btnText.textContent = 'Uploading Content...';
            generateBtn.disabled = true;
        } else {
            generateBtn.classList.remove('loading');
            if (btnText) btnText.textContent = 'Upload Content';
            generateBtn.disabled = false;
        }
    }

    // Helper: Show Error Banner
    function showError(message) {
        if (!errorContainer) return;
        errorContainer.innerHTML = `
            <div class="error-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>${message}</span>
            </div>
        `;
        errorContainer.classList.remove('hidden');
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Helper: Hide Error Banner
    function hideError() {
        if (!errorContainer) return;
        errorContainer.innerHTML = '';
        errorContainer.classList.add('hidden');
    }

    // API Call: Fetch Notes
    async function fetchNotes(text) {
        const res = await fetch('http://localhost:3000/api/generate-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Server responded with status ${res.status} on generating notes.`);
        }
        return res.json();
    }

    // API Call: Fetch Quiz
    async function fetchQuiz(text) {
        const res = await fetch('http://localhost:3000/api/generate-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Server responded with status ${res.status} on generating quiz.`);
        }
        return res.json();
    }

    // HTML entity escaper — prevents XSS when injecting AI text into innerHTML
    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Markdown Parser
    function parseMarkdown(text) {
        if (!text) return '';
        const lines = text.split('\n');
        let html = [];
        let inList = false;

        for (let line of lines) {
            let trimmed = line.trim();

            // Check ### before ## so the more-specific prefix wins
            if (trimmed.startsWith('### ')) {
                if (inList) { html.push('</ul>'); inList = false; }
                html.push(`<h3>${parseInlineMarkdown(escapeHtml(trimmed.substring(4)))}</h3>`);
            } else if (trimmed.startsWith('## ')) {
                if (inList) { html.push('</ul>'); inList = false; }
                html.push(`<h2>${parseInlineMarkdown(escapeHtml(trimmed.substring(3)))}</h2>`);
            } else if (trimmed.startsWith('# ')) {
                if (inList) { html.push('</ul>'); inList = false; }
                html.push(`<h2>${parseInlineMarkdown(escapeHtml(trimmed.substring(2)))}</h2>`);
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                if (!inList) { html.push('<ul>'); inList = true; }
                html.push(`<li>${parseInlineMarkdown(escapeHtml(trimmed.substring(2)))}</li>`);
            } else if (trimmed === '') {
                if (inList) { html.push('</ul>'); inList = false; }
            } else {
                if (inList) { html.push('</ul>'); inList = false; }
                html.push(`<p>${parseInlineMarkdown(escapeHtml(trimmed))}</p>`);
            }
        }
        if (inList) html.push('</ul>');
        return html.join('\n');
    }

    function parseInlineMarkdown(text) {
        // NOTE: text is already HTML-escaped; only re-add safe bold/italic tags
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    // Quiz Renderer
    function renderQuiz(questions) {
        if (!quizQuestions) return;
        quizQuestions.innerHTML = '';

        questions.forEach((q, qIndex) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'quiz-question';
            questionDiv.dataset.questionIndex = qIndex;

            const questionText = document.createElement('div');
            questionText.className = 'quiz-question-text';
            questionText.textContent = `${qIndex + 1}. ${q.question}`;
            questionDiv.appendChild(questionText);

            const optionsList = document.createElement('div');
            optionsList.className = 'quiz-options-list';

            const optionLetters = ['A', 'B', 'C', 'D'];
            q.options.forEach((optText, oIndex) => {
                const letter = optionLetters[oIndex];
                const optionButton = document.createElement('button');
                optionButton.className = 'quiz-option';
                optionButton.textContent = `${letter}. ${optText}`;
                optionButton.dataset.letter = letter;

                optionButton.addEventListener('click', () => {
                    // Selection handling
                    const siblings = optionsList.querySelectorAll('.quiz-option');
                    siblings.forEach(btn => btn.classList.remove('selected'));
                    optionButton.classList.add('selected');
                    userAnswers[qIndex] = letter;
                });

                optionsList.appendChild(optionButton);
            });

            questionDiv.appendChild(optionsList);
            quizQuestions.appendChild(questionDiv);
        });

        // Reset submit state
        if (submitQuizBtn) {
            submitQuizBtn.classList.remove('hidden');
            submitQuizBtn.disabled = false;
            submitQuizBtn.querySelector('span').textContent = 'Submit Quiz';
        }
    }

    // Quiz Submission & Evaluation
    if (submitQuizBtn) {
        submitQuizBtn.addEventListener('click', () => {
            // Check if all questions are answered
            const unanswered = quizData.some((_, idx) => !userAnswers[idx]);
            if (unanswered) {
                alert('Please answer all questions before submitting the quiz.');
                return;
            }

            // Disable further choices
            const allOptions = quizQuestions.querySelectorAll('.quiz-option');
            allOptions.forEach(btn => {
                btn.classList.add('disabled');
            });

            // Calculate Score
            let score = 0;

            quizData.forEach((q, qIndex) => {
                const questionDiv = quizQuestions.querySelector(`.quiz-question[data-question-index="${qIndex}"]`);
                if (!questionDiv) return;

                const correctLetter = q.answer.trim().toUpperCase();
                const userLetter = userAnswers[qIndex];

                if (userLetter === correctLetter) {
                    score++;
                }

                // Highlight buttons
                const buttons = questionDiv.querySelectorAll('.quiz-option');
                buttons.forEach(btn => {
                    const btnLetter = btn.dataset.letter;

                    if (btnLetter === correctLetter) {
                        btn.classList.add('correct');
                    } else if (btnLetter === userLetter) {
                        btn.classList.add('incorrect');
                    }
                });
            });

            // Display Score
            if (quizScore) {
                quizScore.textContent = `You scored ${score} out of ${quizData.length} (${Math.round((score / quizData.length) * 100)}%)`;
                quizScore.classList.remove('hidden');
            }

            // Hide or disable submit button
            submitQuizBtn.disabled = true;
            submitQuizBtn.querySelector('span').textContent = 'Quiz Completed';
        });
    }
});