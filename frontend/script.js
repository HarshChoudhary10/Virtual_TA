// Configuration
const CONFIG = {
    // Default API endpoint - can be changed to your deployed API
    API_ENDPOINT: 'https://fit-snake-strangely.ngrok-free.app/query',
    // Fallback to localhost for development
    // API_ENDPOINT: 'http://localhost:8000/query',
};

// State Management
const state = {
    currentImage: null,
    currentImageBase64: null,
    chatHistory: [],
    theme: localStorage.getItem('theme') || 'light',
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
};

// Initialize App
function init() {
    loadTheme();
    loadChatHistory();
    attachEventListeners();
    autoResizeTextarea();
}

// Theme Management
function loadTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', state.theme);
    loadTheme();
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

    // Example questions
    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const question = e.target.dataset.question;
            showChatSection();
            elements.questionInput.value = question;
            elements.questionInput.focus();
        });
    });

    // Textarea auto-resize
    elements.questionInput.addEventListener('input', autoResizeTextarea);

    // Enter key to submit (Shift+Enter for new line)
    elements.questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            elements.questionForm.dispatchEvent(new Event('submit'));
        }
    });
}

// Navigation
function showChatSection() {
    elements.welcomeSection.style.display = 'none';
    elements.chatSection.style.display = 'block';
    elements.questionInput.focus();
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

// Image Handling
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showError('Please upload a valid image file');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showError('Image size should be less than 5MB');
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
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    state.currentImage = null;
    state.currentImageBase64 = null;
    elements.imagePreview.style.display = 'none';
    elements.imageUpload.value = '';
}

// Question Submission
async function handleQuestionSubmit(e) {
    e.preventDefault();

    const question = elements.questionInput.value.trim();
    if (!question) return;

    // Add user message to chat
    addMessageToChat('user', question, state.currentImage);

    // Clear input
    elements.questionInput.value = '';
    autoResizeTextarea();

    // Show loading
    showLoading();

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

    } catch (error) {
        console.error('Error querying Virtual TA:', error);
        addMessageToChat('assistant', 
            `I'm sorry, I encountered an error: ${error.message}. Please try again or check your internet connection.`,
            null,
            null,
            true
        );
    } finally {
        hideLoading();
        removeImage();
    }
}

// Chat Message Management
function addMessageToChat(role, text, image = null, links = null, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

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

    // Text
    const textP = document.createElement('p');
    textP.textContent = text;
    content.appendChild(textP);

    // Image (if attached by user)
    if (image && role === 'user') {
        const imgElement = document.createElement('img');
        imgElement.className = 'message-image';
        imgElement.src = URL.createObjectURL(image);
        imgElement.alt = 'Uploaded image';
        content.appendChild(imgElement);
    }

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

    // Copy button for assistant messages
    if (role === 'assistant') {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = '📋 Copy';
        copyBtn.onclick = () => copyToClipboard(text, copyBtn);
        content.appendChild(copyBtn);
    }

    messageDiv.appendChild(content);
    elements.chatHistory.appendChild(messageDiv);

    // Scroll to bottom
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;

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
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        button.textContent = '✗ Failed';
        setTimeout(() => {
            button.textContent = '📋 Copy';
        }, 2000);
    });
}

// Loading State
function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
    elements.sendBtn.disabled = true;
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
    elements.sendBtn.disabled = false;
}

// Error Display
function showError(message) {
    // Create a temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '1001';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Chat History Management
function saveChatHistory() {
    try {
        localStorage.setItem('chatHistory', JSON.stringify(state.chatHistory));
    } catch (e) {
        console.error('Failed to save chat history:', e);
    }
}

function loadChatHistory() {
    try {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            state.chatHistory = JSON.parse(saved);
            
            // Restore messages to UI
            state.chatHistory.forEach(msg => {
                addMessageToChat(msg.role, msg.text, null, msg.links);
            });
            
            // Clear the state after restoring to avoid duplicates
            state.chatHistory = [];
        }
    } catch (e) {
        console.error('Failed to load chat history:', e);
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
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
