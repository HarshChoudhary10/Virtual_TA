// Configuration
const CONFIG = {
    // Default API endpoint - can be changed to your deployed API
    API_ENDPOINT: 'https://fit-snake-strangely.ngrok-free.app/query',
    // Fallback to localhost for development
    // API_ENDPOINT: 'http://localhost:8000/query',
    MAX_CHAR_COUNT: 2000,
};

// State Management
const state = {
    currentImage: null,
    currentImageBase64: null,
    chatHistory: [],
    theme: localStorage.getItem('theme') || 'light',
    recognition: null,
    isRecording: false,
};

// DOM Elements
const elements = {
    welcomeSection: document.getElementById('welcomeSection'),
    chatSection: document.getElementById('chatSection'),
    getStartedBtn: document.getElementById('getStartedBtn'),
    backToHome: document.getElementById('backToHome'),
    questionForm: document.getElementById('questionForm'),
    questionInput: document.getElementById('questionInput'),
    sendBtn: document.getElementById('sendBtn'),
    chatHistory: document.getElementById('chatHistory'),
    imageUpload: document.getElementById('imageUpload'),
    imagePreview: document.getElementById('imagePreview'),
    previewImg: document.getElementById('previewImg'),
    removeImage: document.getElementById('removeImage'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    themeToggle: document.getElementById('themeToggle'),
    typingIndicator: document.getElementById('typingIndicator'),
    voiceBtn: document.getElementById('voiceBtn'),
    exportBtn: document.getElementById('exportBtn'),
    charCounter: document.getElementById('charCounter'),
    scrollBottomBtn: document.getElementById('scrollBottomBtn'),
    toastContainer: document.getElementById('toastContainer'),
    imageZoomModal: document.getElementById('imageZoomModal'),
    zoomImg: document.getElementById('zoomImg'),
    zoomClose: document.getElementById('zoomClose'),
};

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize App
function init() {
    loadTheme();
    loadChatHistory();
    attachEventListeners();
    autoResizeTextarea();
    initializeMarked();
    initializeSpeechRecognition();
}

// Configure Marked.js for markdown rendering
function initializeMarked() {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true,
            highlight: function(code, lang) {
                if (typeof Prism !== 'undefined' && lang && Prism.languages[lang]) {
                    return Prism.highlight(code, Prism.languages[lang], lang);
                }
                return code;
            }
        });
    }
}

// Theme Management
function loadTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
    // Add smooth transition
    document.body.style.transition = 'background 0.5s ease';
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', state.theme);
    loadTheme();
    showToast('Theme changed to ' + state.theme + ' mode', 'success');
}

function updateThemeIcon() {
    const icon = state.theme === 'light' ? '🌙' : '☀️';
    elements.themeToggle.querySelector('.theme-icon').textContent = icon;
}

// Event Listeners
function attachEventListeners() {
    // Navigation
    elements.getStartedBtn.addEventListener('click', showChatSection);
    elements.backToHome.addEventListener('click', showWelcomeSection);

    // Form submission
    elements.questionForm.addEventListener('submit', handleQuestionSubmit);

    // Image upload
    elements.imageUpload.addEventListener('change', handleImageUpload);
    elements.removeImage.addEventListener('click', removeImage);

    // Clear history
    elements.clearHistoryBtn.addEventListener('click', clearChatHistory);

    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Voice input
    if (elements.voiceBtn) {
        elements.voiceBtn.addEventListener('click', toggleVoiceInput);
    }

    // Export chat
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', exportChat);
    }

    // Scroll to bottom
    if (elements.scrollBottomBtn) {
        elements.scrollBottomBtn.addEventListener('click', scrollToBottom);
    }

    // Image zoom close
    if (elements.zoomClose) {
        elements.zoomClose.addEventListener('click', closeImageZoom);
    }
    if (elements.imageZoomModal) {
        elements.imageZoomModal.addEventListener('click', (e) => {
            if (e.target === elements.imageZoomModal) {
                closeImageZoom();
            }
        });
    }

    // Example questions
    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const question = e.target.dataset.question;
            showChatSection();
            elements.questionInput.value = question;
            elements.questionInput.focus();
        });
    });

    // Textarea auto-resize with debounce
    const debouncedResize = debounce(autoResizeTextarea, 50);
    elements.questionInput.addEventListener('input', () => {
        debouncedResize();
        updateCharCounter();
    });

    // Enter key to submit (Shift+Enter for new line)
    elements.questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            elements.questionForm.dispatchEvent(new Event('submit'));
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K to focus input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            elements.questionInput.focus();
        }
        // Esc to clear input
        if (e.key === 'Escape' && document.activeElement === elements.questionInput) {
            elements.questionInput.value = '';
            autoResizeTextarea();
            updateCharCounter();
        }
    });

    // Chat scroll detection for scroll-to-bottom button
    if (elements.chatHistory) {
        elements.chatHistory.addEventListener('scroll', handleChatScroll);
    }
}

// Handle chat scroll for showing/hiding scroll button
function handleChatScroll() {
    const chatHistory = elements.chatHistory;
    const isNearBottom = chatHistory.scrollHeight - chatHistory.scrollTop - chatHistory.clientHeight < 100;
    
    if (elements.scrollBottomBtn) {
        elements.scrollBottomBtn.style.display = isNearBottom ? 'none' : 'flex';
    }
}

// Scroll to bottom smoothly
function scrollToBottom() {
    if (elements.chatHistory) {
        elements.chatHistory.scrollTo({
            top: elements.chatHistory.scrollHeight,
            behavior: 'smooth'
        });
    }
}

// Character counter
function updateCharCounter() {
    const length = elements.questionInput.value.length;
    if (elements.charCounter) {
        if (length > 0) {
            elements.charCounter.textContent = `${length}${CONFIG.MAX_CHAR_COUNT ? '/' + CONFIG.MAX_CHAR_COUNT : ''} characters`;
            if (CONFIG.MAX_CHAR_COUNT && length > CONFIG.MAX_CHAR_COUNT) {
                elements.charCounter.style.color = 'var(--error-color)';
            } else {
                elements.charCounter.style.color = 'var(--text-secondary)';
            }
        } else {
            elements.charCounter.textContent = '';
        }
    }
}

// Navigation
function showChatSection() {
    elements.welcomeSection.style.display = 'none';
    elements.chatSection.style.display = 'block';
    elements.questionInput.focus();
    scrollToBottom();
}

function showWelcomeSection() {
    elements.chatSection.style.display = 'none';
    elements.welcomeSection.style.display = 'block';
}

// Auto-resize Textarea
function autoResizeTextarea() {
    const textarea = elements.questionInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close">×</button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Image Handling
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please upload a valid image file', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'error');
        return;
    }

    state.currentImage = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.previewImg.src = e.target.result;
        elements.imagePreview.style.display = 'block';
        
        // Store base64 without data URL prefix
        state.currentImageBase64 = e.target.result.split(',')[1];
        
        // Add click to zoom
        elements.previewImg.style.cursor = 'pointer';
        elements.previewImg.onclick = () => openImageZoom(e.target.result);
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    state.currentImage = null;
    state.currentImageBase64 = null;
    elements.imagePreview.style.display = 'none';
    elements.imageUpload.value = '';
}

// Image Zoom
function openImageZoom(src) {
    elements.zoomImg.src = src;
    elements.imageZoomModal.style.display = 'block';
}

function closeImageZoom() {
    elements.imageZoomModal.style.display = 'none';
}

// Speech Recognition
function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.recognition = new SpeechRecognition();
        state.recognition.continuous = false;
        state.recognition.interimResults = false;
        state.recognition.lang = 'en-US';

        state.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            elements.questionInput.value += (elements.questionInput.value ? ' ' : '') + transcript;
            autoResizeTextarea();
            updateCharCounter();
            showToast('Voice input captured', 'success');
        };

        state.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            showToast('Voice input error: ' + event.error, 'error');
            state.isRecording = false;
            elements.voiceBtn.classList.remove('recording');
        };

        state.recognition.onend = () => {
            state.isRecording = false;
            elements.voiceBtn.classList.remove('recording');
        };
    } else {
        // Hide voice button if not supported
        if (elements.voiceBtn) {
            elements.voiceBtn.style.display = 'none';
        }
    }
}

function toggleVoiceInput() {
    if (!state.recognition) {
        showToast('Voice input not supported in your browser', 'error');
        return;
    }

    if (state.isRecording) {
        state.recognition.stop();
        state.isRecording = false;
        elements.voiceBtn.classList.remove('recording');
    } else {
        state.recognition.start();
        state.isRecording = true;
        elements.voiceBtn.classList.add('recording');
        showToast('Listening... Speak now', 'info');
    }
}

// Export Chat
function exportChat() {
    if (state.chatHistory.length === 0) {
        showToast('No chat history to export', 'info');
        return;
    }

    // Show export options
    const format = confirm('Click OK to export as JSON, or Cancel to export as Text');
    
    if (format) {
        // Export as JSON
        const dataStr = JSON.stringify(state.chatHistory, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        downloadFile(dataBlob, 'chat-history.json');
    } else {
        // Export as Text
        let textContent = 'TDS Virtual TA - Chat History\n';
        textContent += '='.repeat(50) + '\n\n';
        
        state.chatHistory.forEach((msg, index) => {
            textContent += `[${new Date(msg.timestamp).toLocaleString()}]\n`;
            textContent += `${msg.role.toUpperCase()}: ${msg.text}\n`;
            if (msg.links && msg.links.length > 0) {
                textContent += 'Sources:\n';
                msg.links.forEach(link => {
                    textContent += `  - ${link.text || link.url}: ${link.url}\n`;
                });
            }
            textContent += '\n' + '-'.repeat(50) + '\n\n';
        });
        
        const dataBlob = new Blob([textContent], { type: 'text/plain' });
        downloadFile(dataBlob, 'chat-history.txt');
    }
    
    showToast('Chat history exported successfully', 'success');
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Question Submission
async function handleQuestionSubmit(e) {
    e.preventDefault();

    const question = elements.questionInput.value.trim();
    if (!question) return;

    // Check character limit
    if (CONFIG.MAX_CHAR_COUNT && question.length > CONFIG.MAX_CHAR_COUNT) {
        showToast(`Question exceeds ${CONFIG.MAX_CHAR_COUNT} character limit`, 'error');
        return;
    }

    // Add user message to chat
    addMessageToChat('user', question, state.currentImage);

    // Clear input
    elements.questionInput.value = '';
    autoResizeTextarea();
    updateCharCounter();

    // Show typing indicator and loading state
    showTypingIndicator();
    showLoadingState();

    try {
        // Prepare request
        const requestBody = {
            question: question,
        };

        // Add image if present
        if (state.currentImageBase64) {
            requestBody.image = state.currentImageBase64;
        }

        // Make API request
        const response = await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Add assistant message to chat
        addMessageToChat('assistant', data.answer, null, data.links);

        // Save to history
        saveChatHistory();
        
        showToast('Response received', 'success');

    } catch (error) {
        console.error('Error querying Virtual TA:', error);
        addMessageToChat('assistant', 
            `I'm sorry, I encountered an error: ${error.message}. Please try again or check your internet connection.`,
            null,
            null,
            true
        );
        showToast('Failed to get response', 'error');
    } finally {
        hideTypingIndicator();
        hideLoadingState();
        removeImage();
    }
}

// Typing Indicator
function showTypingIndicator() {
    if (elements.typingIndicator) {
        elements.typingIndicator.style.display = 'flex';
        scrollToBottom();
    }
}

function hideTypingIndicator() {
    if (elements.typingIndicator) {
        elements.typingIndicator.style.display = 'none';
    }
}

// Loading State
function showLoadingState() {
    elements.sendBtn.disabled = true;
    elements.sendBtn.classList.add('loading');
}

function hideLoadingState() {
    elements.sendBtn.disabled = false;
    elements.sendBtn.classList.remove('loading');
}

// Chat Message Management
function addMessageToChat(role, text, image = null, links = null, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.style.animation = 'slideIn 0.3s ease, fadeIn 0.3s ease';

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🎓';
    messageDiv.appendChild(avatar);

    // Content
    const content = document.createElement('div');
    content.className = 'message-content';
    
    if (isError) {
        content.classList.add('error-message');
    }

    // Render text with markdown for assistant messages
    if (role === 'assistant' && typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
        const rawHtml = marked.parse(text);
        const cleanHtml = DOMPurify.sanitize(rawHtml);
        content.innerHTML = cleanHtml;
        
        // Apply syntax highlighting to code blocks
        if (typeof Prism !== 'undefined') {
            content.querySelectorAll('pre code').forEach((block) => {
                Prism.highlightElement(block);
            });
        }
    } else {
        const textP = document.createElement('p');
        textP.textContent = text;
        content.appendChild(textP);
    }

    // Image (if attached by user)
    if (image && role === 'user') {
        const imgElement = document.createElement('img');
        imgElement.className = 'message-image';
        imgElement.src = URL.createObjectURL(image);
        imgElement.alt = 'Uploaded image';
        imgElement.style.cursor = 'pointer';
        imgElement.onclick = () => openImageZoom(URL.createObjectURL(image));
        content.appendChild(imgElement);
    }

    // Timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    content.appendChild(timestamp);

    // Links (if provided by assistant)
    if (links && links.length > 0 && role === 'assistant') {
        const linksDiv = document.createElement('div');
        linksDiv.className = 'message-links';
        
        const linksTitle = document.createElement('h4');
        linksTitle.textContent = '📚 Sources:';
        linksDiv.appendChild(linksTitle);

        links.forEach(link => {
            const linkA = document.createElement('a');
            linkA.className = 'source-link';
            linkA.href = link.url;
            linkA.target = '_blank';
            linkA.rel = 'noopener noreferrer';
            linkA.textContent = `📄 ${link.text || link.url}`;
            linksDiv.appendChild(linkA);
        });

        content.appendChild(linksDiv);
    }

    // Copy button for all messages
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = '📋 Copy';
    copyBtn.onclick = () => copyToClipboard(text, copyBtn);
    content.appendChild(copyBtn);

    messageDiv.appendChild(content);
    elements.chatHistory.appendChild(messageDiv);

    // Scroll to bottom with smooth animation
    setTimeout(() => scrollToBottom(), 100);

    // Store in state
    state.chatHistory.push({
        role,
        text,
        links,
        timestamp: new Date().toISOString(),
    });
}

// Copy to Clipboard
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        button.style.background = 'var(--success-color)';
        button.style.color = 'white';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
            button.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy to clipboard', 'error');
    });
}

// Chat History Management
function saveChatHistory() {
    try {
        localStorage.setItem('chatHistory', JSON.stringify(state.chatHistory));
    } catch (e) {
        console.error('Failed to save chat history:', e);
        showToast('Failed to save chat history', 'error');
    }
}

function loadChatHistory() {
    try {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            const history = JSON.parse(saved);
            
            // Restore messages to UI
            history.forEach(msg => {
                // Recreate message div similar to addMessageToChat but without adding to state
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.role}`;

                const avatar = document.createElement('div');
                avatar.className = 'message-avatar';
                avatar.textContent = msg.role === 'user' ? '👤' : '🎓';
                messageDiv.appendChild(avatar);

                const content = document.createElement('div');
                content.className = 'message-content';

                // Render with markdown if assistant message
                if (msg.role === 'assistant' && typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                    const rawHtml = marked.parse(msg.text);
                    const cleanHtml = DOMPurify.sanitize(rawHtml);
                    content.innerHTML = cleanHtml;
                    
                    if (typeof Prism !== 'undefined') {
                        content.querySelectorAll('pre code').forEach((block) => {
                            Prism.highlightElement(block);
                        });
                    }
                } else {
                    const textP = document.createElement('p');
                    textP.textContent = msg.text;
                    content.appendChild(textP);
                }

                // Timestamp
                const timestamp = document.createElement('div');
                timestamp.className = 'message-timestamp';
                timestamp.textContent = new Date(msg.timestamp).toLocaleTimeString();
                content.appendChild(timestamp);

                // Links
                if (msg.links && msg.links.length > 0 && msg.role === 'assistant') {
                    const linksDiv = document.createElement('div');
                    linksDiv.className = 'message-links';
                    
                    const linksTitle = document.createElement('h4');
                    linksTitle.textContent = '📚 Sources:';
                    linksDiv.appendChild(linksTitle);

                    msg.links.forEach(link => {
                        const linkA = document.createElement('a');
                        linkA.className = 'source-link';
                        linkA.href = link.url;
                        linkA.target = '_blank';
                        linkA.rel = 'noopener noreferrer';
                        linkA.textContent = `📄 ${link.text || link.url}`;
                        linksDiv.appendChild(linkA);
                    });

                    content.appendChild(linksDiv);
                }

                // Copy button
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-btn';
                copyBtn.textContent = '📋 Copy';
                copyBtn.onclick = () => copyToClipboard(msg.text, copyBtn);
                content.appendChild(copyBtn);

                messageDiv.appendChild(content);
                elements.chatHistory.appendChild(messageDiv);
            });
            
            // Load into state
            state.chatHistory = history;
        }
    } catch (e) {
        console.error('Failed to load chat history:', e);
        showToast('Failed to load chat history', 'error');
    }
}

function clearChatHistory() {
    if (confirm('Are you sure you want to clear the chat history?')) {
        state.chatHistory = [];
        localStorage.removeItem('chatHistory');
        
        // Clear chat UI
        elements.chatHistory.innerHTML = `
            <div class="chat-welcome">
                <p>👋 Hello! I'm your Virtual TA. Ask me anything about the TDS course!</p>
            </div>
        `;
        
        showToast('Chat history cleared', 'success');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
