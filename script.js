document.addEventListener('DOMContentLoaded', () => {
    // ── Nav links: active state + scroll/section navigation ────────────────
    const navLinks = document.querySelectorAll('.nav-content a');

    function activateNavLink(link) {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    }

    // Helper: smooth-scroll to an element with a quick highlight pulse
    function scrollToCard(el) {
        if (!el || el.classList.contains('hidden')) return false;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('nav-highlight');
        setTimeout(() => el.classList.remove('nav-highlight'), 900);
        return true;
    }

    // Simple toast for sections that aren't built yet
    function showToast(msg) {
        const existing = document.getElementById('nav-toast');
        if (existing) existing.remove();
        const t = document.createElement('div');
        t.id = 'nav-toast';
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('nav-toast-show'));
        setTimeout(() => { t.classList.remove('nav-toast-show'); setTimeout(() => t.remove(), 300); }, 2800);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            activateNavLink(link);
            const target = link.dataset.nav;

            if (target === 'home') {
                window.scrollTo({ top: 0, behavior: 'smooth' });

            } else if (target === 'notes') {
                const card = document.getElementById('notes-card');
                if (!scrollToCard(card)) {
                    showToast('Generate notes first — paste your study material and click Upload Content.');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }

            } else if (target === 'quiz') {
                const card = document.getElementById('quiz-card');
                if (!scrollToCard(card)) {
                    showToast('Generate a quiz first — paste your study material and click Upload Content.');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }

            } else if (target === 'saved') {
                const card = document.getElementById('saved-card');
                card.classList.remove('hidden');
                renderSavedItems();
                scrollToCard(card);
            }
        });
    });

    // ── Character counter ───────────────────────────────────────────────────
    const textarea     = document.getElementById('raw-notes-input');
    const charCountSpan = document.querySelector('.char-count');

    function updateCharCount() {
        if (!textarea || !charCountSpan) return;
        const count = textarea.value.length;
        charCountSpan.textContent = `${count.toLocaleString()} character${count !== 1 ? 's' : ''}`;
    }

    if (textarea) textarea.addEventListener('input', updateCharCount);

    // ── PDF Tab System ──────────────────────────────────────────────────────
    const tabText      = document.getElementById('tab-text');
    const tabPdf       = document.getElementById('tab-pdf');
    const panelText    = document.getElementById('panel-text');
    const panelPdf     = document.getElementById('panel-pdf');
    const pdfDropzone  = document.getElementById('pdf-dropzone');
    const pdfFileInput = document.getElementById('pdf-file-input');
    const pdfBrowseBtn = document.getElementById('pdf-browse-btn');
    const pdfStatus    = document.getElementById('pdf-status');
    const pdfStatusTxt = document.getElementById('pdf-status-text');
    const pdfClearBtn  = document.getElementById('pdf-clear-btn');

    // Tab switching
    function switchTab(tab) {
        if (tab === 'text') {
            tabText.classList.add('active');
            tabPdf.classList.remove('active');
            panelText.classList.remove('hidden');
            panelPdf.classList.add('hidden');
        } else {
            tabPdf.classList.add('active');
            tabText.classList.remove('active');
            panelPdf.classList.remove('hidden');
            panelText.classList.add('hidden');
        }
    }

    tabText?.addEventListener('click', () => switchTab('text'));
    tabPdf?.addEventListener('click',  () => switchTab('pdf'));

    // ── PDF.js extraction ───────────────────────────────────────────────────
    // Configure worker path (same CDN version)
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    async function extractTextFromPDF(file) {
        if (!window.pdfjsLib) throw new Error('PDF.js failed to load. Please refresh and try again.');
        if (file.size > 52_428_800) throw new Error('File is too large. Maximum size is 50 MB.');

        // Show extracting loader inside the status bar
        pdfStatus.classList.remove('hidden');
        pdfStatusTxt.innerHTML =
            `<span class="pdf-extracting"><span class="dot"></span><span class="dot"></span><span class="dot"></span>&nbsp;Extracting text…</span>`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        const cleaned = fullText.replace(/\s+/g, ' ').trim();
        if (!cleaned) throw new Error('No readable text found in this PDF. It may be a scanned image.');
        return { text: cleaned, pages: pdf.numPages };
    }

    function showPdfSuccess(fileName, pages, charCount) {
        pdfDropzone.classList.add('hidden');
        pdfStatus.classList.remove('hidden');
        pdfStatusTxt.innerHTML =
            `<strong>${fileName}</strong> &mdash; ${pages} page${pages !== 1 ? 's' : ''}, ${charCount.toLocaleString()} characters extracted`;
    }

    function clearPdf() {
        textarea.value = '';
        updateCharCount();
        pdfFileInput.value = '';
        pdfStatus.classList.add('hidden');
        pdfDropzone.classList.remove('hidden');
    }

    async function handlePdfFile(file) {
        if (!file || file.type !== 'application/pdf') {
            showToast('Please select a valid PDF file.');
            return;
        }
        try {
            const { text, pages } = await extractTextFromPDF(file);
            textarea.value = text;
            updateCharCount();
            showPdfSuccess(file.name, pages, text.length);
        } catch (err) {
            pdfStatus.classList.add('hidden');
            pdfDropzone.classList.remove('hidden');
            showToast(`PDF error: ${err.message}`);
        }
    }

    // Browse button
    pdfBrowseBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        pdfFileInput?.click();
    });

    // Drop zone click also opens file picker
    pdfDropzone?.addEventListener('click', () => pdfFileInput?.click());

    // File input change
    pdfFileInput?.addEventListener('change', () => {
        if (pdfFileInput.files[0]) handlePdfFile(pdfFileInput.files[0]);
    });

    // Drag & drop
    pdfDropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        pdfDropzone.classList.add('drag-over');
    });
    pdfDropzone?.addEventListener('dragleave', () => {
        pdfDropzone.classList.remove('drag-over');
    });
    pdfDropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfDropzone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handlePdfFile(file);
    });

    // Clear button
    pdfClearBtn?.addEventListener('click', clearPdf);

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
            lastEvaluatedScore = null;
            if (saveNotesBtn) {
                const span = saveNotesBtn.querySelector('span');
                if (span) span.textContent = 'Save Notes';
            }

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

    const API_BASE = 'https://notes-ai-backend-1pcb.onrender.com';

    // API Call: Fetch Notes
    async function fetchNotes(text) {
        const res = await fetch(`${API_BASE}/api/generate-notes`, {
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
        const res = await fetch(`${API_BASE}/api/generate-quiz`, {
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
            submitQuizBtn.disabled = false;
            submitQuizBtn.querySelector('span').textContent = 'Save Quiz';
            lastEvaluatedScore = `${score}/${quizData.length}`;
        });
    }

    // ── Save Notes Handler ────────────────────────────────────────────────────
    const saveNotesBtn = document.getElementById('save-notes-btn');
    if (saveNotesBtn) {
        saveNotesBtn.addEventListener('click', () => {
            if (!notesContent || !notesContent.innerHTML.trim()) {
                showToast('No notes to save.');
                return;
            }
            saveItem({
                type: 'note',
                title: 'Study Notes (' + new Date().toLocaleDateString() + ')',
                content: notesContent.innerHTML,
                date: new Date().toLocaleString()
            });
            const span = saveNotesBtn.querySelector('span');
            if (span) span.textContent = 'Saved ✓';
            showToast('Notes saved to your Saved collection!');
        });
    }

    // ── Saved Collection Helpers & Storage ────────────────────────────────────
    let lastEvaluatedScore = null;

    function getSavedItems() {
        try { return JSON.parse(localStorage.getItem('notes_ai_saved') || '[]'); }
        catch { return []; }
    }

    function saveItem(item) {
        const items = getSavedItems();
        item.id = Date.now().toString();
        items.unshift(item);
        localStorage.setItem('notes_ai_saved', JSON.stringify(items));
        renderSavedItems();
    }

    function deleteSavedItem(id) {
        let items = getSavedItems();
        items = items.filter(i => i.id !== id);
        localStorage.setItem('notes_ai_saved', JSON.stringify(items));
        renderSavedItems();
        showToast('Item removed from Saved collection.');
    }

    function renderSavedItems() {
        const container = document.getElementById('saved-items-list');
        if (!container) return;
        const items = getSavedItems();

        if (items.length === 0) {
            container.innerHTML = `
                <div class="saved-empty">
                    <div class="empty-icon">📁</div>
                    <p>No saved notes or quizzes yet.</p>
                    <span>Click "Save Notes" or "Save Quiz" on generated results to store them here.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="saved-item-card" data-id="${item.id}">
                <div class="saved-item-header">
                    <div class="saved-item-title-group">
                        <span class="saved-icon">${item.type === 'note' ? '📝' : '🧠'}</span>
                        <div>
                            <h4 class="saved-item-title">${escapeHtml(item.title)}</h4>
                            <span class="saved-item-date">${escapeHtml(item.date)}</span>
                        </div>
                    </div>
                    <div class="saved-item-actions">
                        <button class="saved-view-btn" data-action="view" data-id="${item.id}">View</button>
                        <button class="saved-delete-btn" data-action="delete" data-id="${item.id}">&times;</button>
                    </div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('[data-action="view"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const item = getSavedItems().find(i => i.id === id);
                if (!item) return;

                if (item.type === 'note') {
                    notesContent.innerHTML = item.content;
                    notesCard.classList.remove('hidden');
                    scrollToCard(notesCard);
                } else if (item.type === 'quiz') {
                    quizData = item.quizData || [];
                    userAnswers = item.userAnswers || {};
                    renderQuiz(quizData);
                    if (item.score) {
                        quizScore.textContent = `Scored: ${item.score}`;
                        quizScore.classList.remove('hidden');
                    }
                    quizCard.classList.remove('hidden');
                    scrollToCard(quizCard);
                }
            });
        });

        container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                deleteSavedItem(id);
            });
        });
    }

    // Handle Quiz Save click when button text is "Save Quiz"
    if (submitQuizBtn) {
        const originalListener = submitQuizBtn.cloneNode(true);
        submitQuizBtn.parentNode.replaceChild(originalListener, submitQuizBtn);
        
        originalListener.addEventListener('click', () => {
            const span = originalListener.querySelector('span');
            const btnText = span ? span.textContent.trim() : '';

            if (btnText === 'Save Quiz') {
                saveItem({
                    type: 'quiz',
                    title: `Quiz (${lastEvaluatedScore || 'Completed'}) - ${new Date().toLocaleDateString()}`,
                    score: lastEvaluatedScore,
                    quizData: quizData,
                    userAnswers: userAnswers,
                    date: new Date().toLocaleString()
                });
                span.textContent = 'Saved ✓';
                showToast('Quiz saved to your Saved collection!');
                return;
            }

            if (btnText === 'Saved ✓') {
                showToast('Already saved to your Saved collection.');
                return;
            }

            // Normal Submit Quiz logic
            const unanswered = quizData.some((_, idx) => !userAnswers[idx]);
            if (unanswered) {
                alert('Please answer all questions before submitting the quiz.');
                return;
            }

            const allOptions = quizQuestions.querySelectorAll('.quiz-option');
            allOptions.forEach(btn => {
                btn.classList.add('disabled');
            });

            let score = 0;
            quizData.forEach((q, qIndex) => {
                const questionDiv = quizQuestions.querySelector(`.quiz-question[data-question-index="${qIndex}"]`);
                if (!questionDiv) return;

                const correctLetter = q.answer.trim().toUpperCase();
                const userLetter = userAnswers[qIndex];

                if (userLetter === correctLetter) {
                    score++;
                }

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

            if (quizScore) {
                quizScore.textContent = `You scored ${score} out of ${quizData.length} (${Math.round((score / quizData.length) * 100)}%)`;
                quizScore.classList.remove('hidden');
            }

            lastEvaluatedScore = `${score}/${quizData.length}`;
            if (span) span.textContent = 'Save Quiz';
        });
    }

    // ── Traffic Lights for Notes Card ────────────────────────────────────────
    (function wireTrafficLights(cardId, redId, yellowId, greenId, bodySelector) {
        const card   = document.getElementById(cardId);
        const red    = document.getElementById(redId);
        const yellow = document.getElementById(yellowId);
        const green  = document.getElementById(greenId);
        if (!card || !red || !yellow || !green) return;

        const body = card.querySelector(bodySelector);
        let minimized  = false;
        let maximized  = false;

        // RED — close (hide the whole card)
        red.addEventListener('click', () => {
            card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.96) translateY(-8px)';
            setTimeout(() => {
                card.classList.add('hidden');
                card.style.opacity = '';
                card.style.transform = '';
                // If both cards closed, re-activate Home nav
                const otherCardId = cardId === 'notes-card' ? 'quiz-card' : 'notes-card';
                const other = document.getElementById(otherCardId);
                if (other && other.classList.contains('hidden')) {
                    navLinks.forEach(l => l.classList.remove('active'));
                    document.querySelector('[data-nav="home"]')?.classList.add('active');
                }
            }, 250);
        });

        // YELLOW — minimize / restore (collapse card body)
        yellow.addEventListener('click', () => {
            if (!body) return;
            minimized = !minimized;
            if (minimized) {
                body.style.transition = 'max-height 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease';
                body.style.maxHeight  = body.scrollHeight + 'px';
                // Force reflow so transition fires
                body.offsetHeight; // eslint-disable-line
                body.style.maxHeight  = '0';
                body.style.opacity    = '0';
                body.style.overflow   = 'hidden';
                yellow.title = 'Restore';
            } else {
                body.style.maxHeight = body.scrollHeight + 'px';
                body.style.opacity   = '1';
                setTimeout(() => {
                    body.style.maxHeight = '';
                    body.style.overflow  = '';
                }, 350);
                yellow.title = 'Minimize';
            }
        });

        // GREEN — maximize / restore (full viewport width)
        green.addEventListener('click', () => {
            maximized = !maximized;
            if (maximized) {
                card.style.transition  = 'all 0.35s cubic-bezier(0.16,1,0.3,1)';
                card.style.maxWidth    = '100%';
                card.style.borderRadius = '0';
                card.style.boxShadow   = '0 0 0 2px rgba(0,113,227,0.3), 0 24px 80px rgba(0,113,227,0.12)';
                green.title = 'Restore';
            } else {
                card.style.maxWidth    = '';
                card.style.borderRadius = '';
                card.style.boxShadow   = '';
                green.title = 'Maximize';
            }
        });
    })('notes-card', 'notes-red', 'notes-yellow', 'notes-green', '.markdown-body');

    (function wireTrafficLights(cardId, redId, yellowId, greenId, bodySelector) {
        const card   = document.getElementById(cardId);
        const red    = document.getElementById(redId);
        const yellow = document.getElementById(yellowId);
        const green  = document.getElementById(greenId);
        if (!card || !red || !yellow || !green) return;

        const body = card.querySelector(bodySelector);
        let minimized  = false;
        let maximized  = false;

        red.addEventListener('click', () => {
            card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.96) translateY(-8px)';
            setTimeout(() => {
                card.classList.add('hidden');
                card.style.opacity = '';
                card.style.transform = '';
                const otherCardId = cardId === 'notes-card' ? 'quiz-card' : 'notes-card';
                const other = document.getElementById(otherCardId);
                if (other && other.classList.contains('hidden')) {
                    navLinks.forEach(l => l.classList.remove('active'));
                    document.querySelector('[data-nav="home"]')?.classList.add('active');
                }
            }, 250);
        });

        yellow.addEventListener('click', () => {
            if (!body) return;
            minimized = !minimized;
            if (minimized) {
                body.style.transition = 'max-height 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease';
                body.style.maxHeight  = body.scrollHeight + 'px';
                body.offsetHeight;
                body.style.maxHeight  = '0';
                body.style.opacity    = '0';
                body.style.overflow   = 'hidden';
                yellow.title = 'Restore';
            } else {
                body.style.maxHeight = body.scrollHeight + 'px';
                body.style.opacity   = '1';
                setTimeout(() => {
                    body.style.maxHeight = '';
                    body.style.overflow  = '';
                }, 350);
                yellow.title = 'Minimize';
            }
        });

        green.addEventListener('click', () => {
            maximized = !maximized;
            if (maximized) {
                card.style.transition   = 'all 0.35s cubic-bezier(0.16,1,0.3,1)';
                card.style.maxWidth     = '100%';
                card.style.borderRadius = '0';
                card.style.boxShadow    = '0 0 0 2px rgba(0,113,227,0.3), 0 24px 80px rgba(0,113,227,0.12)';
                green.title = 'Restore';
            } else {
                card.style.maxWidth     = '';
                card.style.borderRadius = '';
                card.style.boxShadow    = '';
                green.title = 'Maximize';
            }
        });
    })('quiz-card', 'quiz-red', 'quiz-yellow', 'quiz-green', '#quiz-body');

    (function wireTrafficLights(cardId, redId, yellowId, greenId, bodySelector) {
        const card   = document.getElementById(cardId);
        const red    = document.getElementById(redId);
        const yellow = document.getElementById(yellowId);
        const green  = document.getElementById(greenId);
        if (!card || !red || !yellow || !green) return;

        const body = card.querySelector(bodySelector);
        let minimized  = false;
        let maximized  = false;

        red.addEventListener('click', () => {
            card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.96) translateY(-8px)';
            setTimeout(() => {
                card.classList.add('hidden');
                card.style.opacity = '';
                card.style.transform = '';
            }, 250);
        });

        yellow.addEventListener('click', () => {
            if (!body) return;
            minimized = !minimized;
            if (minimized) {
                body.style.transition = 'max-height 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease';
                body.style.maxHeight  = body.scrollHeight + 'px';
                body.offsetHeight;
                body.style.maxHeight  = '0';
                body.style.opacity    = '0';
                body.style.overflow   = 'hidden';
                yellow.title = 'Restore';
            } else {
                body.style.maxHeight = body.scrollHeight + 'px';
                body.style.opacity   = '1';
                setTimeout(() => {
                    body.style.maxHeight = '';
                    body.style.overflow  = '';
                }, 350);
                yellow.title = 'Minimize';
            }
        });

        green.addEventListener('click', () => {
            maximized = !maximized;
            if (maximized) {
                card.style.transition   = 'all 0.35s cubic-bezier(0.16,1,0.3,1)';
                card.style.maxWidth     = '100%';
                card.style.borderRadius = '0';
                card.style.boxShadow    = '0 0 0 2px rgba(0,113,227,0.3), 0 24px 80px rgba(0,113,227,0.12)';
                green.title = 'Restore';
            } else {
                card.style.maxWidth     = '';
                card.style.borderRadius = '';
                card.style.boxShadow    = '';
                green.title = 'Maximize';
            }
        });
    })('saved-card', 'saved-red', 'saved-yellow', 'saved-green', '#saved-body');

    // ═══════════════════════════════════════════
    //  AUTH SYSTEM
    // ═══════════════════════════════════════════

    const loginBtn       = document.querySelector('.auth-buttons .login');
    const signupBtn      = document.querySelector('.auth-buttons .signup');
    const authButtons    = document.querySelector('.auth-buttons');

    const loginOverlay   = document.getElementById('login-overlay');
    const signupOverlay  = document.getElementById('signup-overlay');

    const loginForm      = document.getElementById('login-form');
    const signupForm     = document.getElementById('signup-form');

    const loginError     = document.getElementById('login-error');
    const signupError    = document.getElementById('signup-error');

    const loginSubmitBtn  = document.getElementById('login-submit-btn');
    const signupSubmitBtn = document.getElementById('signup-submit-btn');

    const goToSignup     = document.getElementById('go-to-signup');
    const goToLogin      = document.getElementById('go-to-login');

    const loginCloseBtn  = document.getElementById('login-close-btn');
    const signupCloseBtn = document.getElementById('signup-close-btn');

    // ── Open / Close helpers ─────────────────────────────────────
    function openModal(overlay) {
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Focus first input
        const first = overlay.querySelector('input');
        if (first) setTimeout(() => first.focus(), 50);
    }

    function closeModal(overlay) {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
        clearModalError(overlay);
    }

    function clearModalError(overlay) {
        const err = overlay.querySelector('.modal-error');
        if (err) { err.textContent = ''; err.classList.add('hidden'); }
    }

    function showModalError(errorEl, message) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    function setModalLoading(btn, isLoading, defaultText) {
        const span = btn.querySelector('span');
        btn.disabled = isLoading;
        if (span) span.textContent = isLoading ? 'Please wait...' : defaultText;
    }

    // ── Modal triggers ───────────────────────────────────────────
    if (loginBtn)  loginBtn.addEventListener('click',  () => openModal(loginOverlay));
    if (signupBtn) signupBtn.addEventListener('click', () => openModal(signupOverlay));

    if (loginCloseBtn)  loginCloseBtn.addEventListener('click',  () => closeModal(loginOverlay));
    if (signupCloseBtn) signupCloseBtn.addEventListener('click', () => closeModal(signupOverlay));

    // Close on backdrop click
    [loginOverlay, signupOverlay].forEach(overlay => {
        if (!overlay) return;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay);
        });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (loginOverlay && !loginOverlay.classList.contains('hidden'))   closeModal(loginOverlay);
            if (signupOverlay && !signupOverlay.classList.contains('hidden')) closeModal(signupOverlay);
        }
    });

    // Switch between modals
    if (goToSignup) goToSignup.addEventListener('click', () => {
        closeModal(loginOverlay);
        openModal(signupOverlay);
    });
    if (goToLogin) goToLogin.addEventListener('click', () => {
        closeModal(signupOverlay);
        openModal(loginOverlay);
    });

    // ── Navbar: update to logged-in state ───────────────────────
    function setLoggedIn(user) {
        if (!authButtons) return;
        const initials = user.name.split(' ').map(w => w[0]).join('').substring(0, 2);
        authButtons.innerHTML = `
            <div class="user-pill">
                <div class="user-avatar">${initials}</div>
                <span class="user-name">${user.name.split(' ')[0]}</span>
            </div>
            <button class="logout-btn" id="logout-btn">Log out</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
    }

    function setLoggedOut() {
        if (!authButtons) return;
        authButtons.innerHTML = `
            <button class="login">Login</button>
            <button class="signup">Signup</button>
        `;
        authButtons.querySelector('.login').addEventListener('click', () => openModal(loginOverlay));
        authButtons.querySelector('.signup').addEventListener('click', () => openModal(signupOverlay));
    }

    function handleLogout() {
        localStorage.removeItem('notesai_token');
        localStorage.removeItem('notesai_user');
        setLoggedOut();
    }

    // ── Login form submit ────────────────────────────────────────
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearModalError(loginOverlay);

            const email    = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                showModalError(loginError, 'Please fill in all fields.');
                return;
            }

            setModalLoading(loginSubmitBtn, true, 'Sign In');
            try {
                const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Login failed.');

                localStorage.setItem('notesai_token', data.token);
                localStorage.setItem('notesai_user', JSON.stringify(data.user));
                closeModal(loginOverlay);
                setLoggedIn(data.user);
                loginForm.reset();
            } catch (err) {
                showModalError(loginError, err.message);
            } finally {
                setModalLoading(loginSubmitBtn, false, 'Sign In');
            }
        });
    }

    // ── Signup form submit ───────────────────────────────────────
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearModalError(signupOverlay);

            const name     = document.getElementById('signup-name').value.trim();
            const email    = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;

            if (!name || !email || !password) {
                showModalError(signupError, 'Please fill in all fields.');
                return;
            }

            setModalLoading(signupSubmitBtn, true, 'Create Account');
            try {
                const res = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Registration failed.');

                localStorage.setItem('notesai_token', data.token);
                localStorage.setItem('notesai_user', JSON.stringify(data.user));
                closeModal(signupOverlay);
                setLoggedIn(data.user);
                signupForm.reset();
            } catch (err) {
                showModalError(signupError, err.message);
            } finally {
                setModalLoading(signupSubmitBtn, false, 'Create Account');
            }
        });
    }

    // ── Restore session on page load ─────────────────────────────
    (function checkAuthOnLoad() {
        const token = localStorage.getItem('notesai_token');
        const user  = localStorage.getItem('notesai_user');
        if (token && user) {
            try { setLoggedIn(JSON.parse(user)); }
            catch { localStorage.removeItem('notesai_token'); localStorage.removeItem('notesai_user'); }
        }
    })();

});