# Virtual TA Frontend

A modern, responsive web interface for the TDS Virtual Teaching Assistant API.

# Virtual TA Frontend

A modern, responsive web interface for the TDS Virtual Teaching Assistant API with advanced UI/UX features, animations, and real-time interactions.

## ✨ Features

### Core Functionality
- 💬 **Ask Questions**: Submit course-related questions and get AI-powered answers
- 🖼️ **Image Upload**: Upload screenshots for better context using OCR
- 🔗 **Source Links**: Every answer includes verifiable source references
- 💾 **Chat History**: Automatically saves conversation history locally
- 📋 **Copy Messages**: Copy any message (user or assistant) to clipboard

### Visual Design ✨ NEW
- 🎨 **Gradient Backgrounds**: Beautiful gradient backgrounds for both themes
- 🪟 **Glassmorphism Effects**: Modern frosted glass effects on cards and header
- ⚡ **Smooth Animations**: Fade-in, slide-in, bounce, and micro-interactions
- 🌓 **Enhanced Dark Mode**: Seamless light/dark theme toggle with smooth transitions
- 📱 **Fully Responsive**: Optimized for all screen sizes (mobile-first approach)

### Advanced Chat Features ✨ NEW
- 📝 **Markdown Rendering**: AI responses support markdown (bold, italic, lists, code blocks)
- 🎨 **Code Syntax Highlighting**: Automatic syntax highlighting for code blocks
- ⌨️ **Typing Indicator**: Animated "Virtual TA is typing..." while waiting for response
- 🕒 **Message Timestamps**: Each message shows when it was sent
- 🔍 **Image Zoom**: Click images to view in full-screen modal
- 📥 **Export Chat**: Download chat history as text or JSON file

### Input Enhancements ✨ NEW
- 🎤 **Voice Input**: Speech-to-text using Web Speech API (Ctrl+V or button)
- 🔢 **Character Counter**: Real-time count with configurable limit (2000 chars)
- 📏 **Auto-Resize Textarea**: Dynamically adjusts height as you type
- ⬇️ **Scroll to Bottom**: Auto-scroll with manual scroll-to-bottom button
- ⌨️ **Keyboard Shortcuts**:
  - `Ctrl/Cmd + K`: Focus input field
  - `Esc`: Clear input field
  - `Enter`: Submit question
  - `Shift + Enter`: New line

### User Experience ✨ NEW
- 🔔 **Toast Notifications**: Modern notifications for success/error/info messages
- ⏳ **Loading States**: Clear visual feedback during API calls
- ♿ **Accessibility**: ARIA labels, keyboard navigation, high contrast
- 🎯 **Example Questions**: Quick-start buttons on welcome page

## Quick Start

### Option 1: Open Locally

1. Simply open `index.html` in your web browser
2. The frontend will connect to the default API endpoint

### Option 2: Use a Local Server

For better compatibility and testing:

```bash
# Using Python 3
cd frontend
python3 -m http.server 8080

# Or using Node.js
npx http-server -p 8080
```

Then visit `http://localhost:8080` in your browser.

## Configuration

### Changing the API Endpoint

By default, the frontend connects to: `https://fit-snake-strangely.ngrok-free.app/query`

To change the API endpoint, edit `script.js`:

```javascript
const CONFIG = {
    API_ENDPOINT: 'https://your-api-endpoint.com/query',
    MAX_CHAR_COUNT: 2000, // Optional character limit for questions
};
```

For local development with the API running on your machine:

```javascript
const CONFIG = {
    API_ENDPOINT: 'http://localhost:8000/query',
    MAX_CHAR_COUNT: 2000,
};
```

### CDN Dependencies ✨ NEW

The frontend uses CDN-hosted libraries (no build process required):
- **Marked.js** (v11.1.1): Markdown parsing
- **DOMPurify** (v3.0.8): HTML sanitization for security
- **Prism.js** (v1.29.0): Syntax highlighting for code blocks

All features gracefully degrade if CDN libraries fail to load.

## File Structure

```
frontend/
├── index.html      # Main HTML structure
├── styles.css      # Styling and themes
├── script.js       # JavaScript functionality
└── README.md       # This file
```

## How to Use

1. **Start the Application**: Open `index.html` or serve it via a web server
2. **Click "Get Started"**: Navigate to the chat interface
3. **Ask a Question**: Type your question in the input field
4. **Optional - Upload Image**: Click the 📎 icon to attach a screenshot
5. **Submit**: Press Enter or click the send button
6. **View Answer**: The Virtual TA will respond with an answer and source links

### Example Questions

Try asking:
- "What is the TDS course about?"
- "How do I submit assignments?"
- "What are the course requirements?"
- "How can I access course materials?"

## Features in Detail

### Theme Toggle
Click the moon/sun icon in the header to switch between light and dark modes. Your preference is saved automatically. The theme toggle now includes a smooth rotation animation.

### Markdown & Code Support ✨ NEW
- AI responses are rendered with **markdown support**
- Code blocks automatically get **syntax highlighting**
- Supports bold, italic, lists, links, blockquotes, and more
- All HTML is sanitized for security

### Voice Input ✨ NEW
- Click the 🎤 microphone icon to start voice input
- Speak your question naturally
- Works in Chrome, Edge, and Safari (requires HTTPS in production)
- Visual indicator shows when recording

### Export Chat ✨ NEW
- Click the 📥 Export button
- Choose between text or JSON format
- Downloads your entire chat history
- Includes timestamps and source links

### Toast Notifications ✨ NEW
- Modern notifications replace old alerts
- Success (✓), Error (✗), and Info (ℹ) variants
- Auto-dismiss after 5 seconds
- Manual close button available

### Image Upload & Zoom ✨ NEW
- Click the 📎 icon to upload an image
- Supports common image formats (PNG, JPG, etc.)
- Maximum file size: 5MB
- Preview appears before sending
- Click any image to zoom and view full-screen
- Remove image by clicking the × button

### Chat History
- Conversations are saved automatically in browser storage
- History persists across sessions
- Click "Clear History" to delete saved conversations

### Copy to Clipboard
- Each message (user and assistant) has a "📋 Copy" button ✨ UPDATED
- Click to copy the message text
- Visual confirmation when copied successfully
- Green highlight indicates successful copy

### Keyboard Shortcuts ✨ NEW
- `Ctrl/Cmd + K`: Quickly focus the input field
- `Esc`: Clear the input field
- `Enter`: Submit your question
- `Shift + Enter`: Add a new line in the input

## Browser Compatibility

- ✅ Chrome/Edge (recommended) - Full support including voice input
- ✅ Firefox - Full support including voice input  
- ✅ Safari - Full support (voice input may vary by version)
- ✅ Mobile browsers - Fully responsive (iOS Safari, Chrome Mobile)

**Note**: Voice input requires HTTPS in production due to browser security requirements.

## Deployment

### GitHub Pages

1. Push the frontend folder to your repository
2. Go to Settings → Pages
3. Select the branch and `/frontend` folder
4. Your site will be available at `https://username.github.io/repo-name/`

### Netlify

1. Drag and drop the `frontend` folder to Netlify
2. Or connect your GitHub repository
3. Deploy automatically

### Vercel

```bash
cd frontend
vercel deploy
```

## Troubleshooting

### API Connection Issues

If you see "API Error" messages:

1. **Check the API endpoint** in `script.js`
2. **Verify CORS settings** on the backend API
3. **Check browser console** for detailed error messages
4. **Ensure the API is running** and accessible
5. **Look for toast notifications** - they provide specific error details ✨ NEW

### CDN Libraries Not Loading ✨ NEW

If markdown or syntax highlighting doesn't work:

1. **Check browser console** for CDN loading errors
2. **Verify internet connection** (CDN requires network access)
3. **Try a different network** (some networks block CDN domains)
4. **Basic functionality still works** - features degrade gracefully

### Voice Input Not Working ✨ NEW

1. **Check browser support** (Chrome/Edge/Safari)
2. **Verify microphone permissions** in browser settings
3. **Use HTTPS** in production (required for Web Speech API)
4. **Check browser console** for specific errors

### Image Upload Not Working

1. **Check file size** (must be under 5MB)
2. **Verify file type** (must be an image)
3. **Check browser console** for errors
4. **Try a different image** to rule out corruption

### Chat History Not Saving

1. **Enable local storage** in browser settings
2. **Check if in incognito/private mode** (storage may be disabled)
3. **Clear browser cache** if issues persist

## Development

### Customization

**Change Colors**: Edit CSS variables in `styles.css`:
```css
:root {
    --primary-color: #4A90E2;
    --secondary-color: #357ABD;
    --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    /* ... more variables */
}
```

**Change Gradients** ✨ NEW:
```css
[data-theme="light"] body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

[data-theme="dark"] body {
    background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
}
```

**Add Features**: Extend functionality in `script.js`

**Modify Layout**: Update structure in `index.html`

### Performance Optimizations ✨ NEW

The frontend includes several performance optimizations:
- **Debounced textarea resize** (50ms delay)
- **GPU-accelerated animations** (using CSS transforms)
- **Efficient local storage** for chat history
- **Lazy loading** for images and modals
- **Optimized event listeners** with proper cleanup

## API Integration

The frontend expects the API to return responses in this format:

```json
{
    "answer": "The answer text goes here...",
    "links": [
        {
            "url": "https://example.com/source1",
            "text": "Source description"
        }
    ]
}
```

Request format:
```json
{
    "question": "User question here",
    "image": "base64_encoded_image_data_optional"
}
```

## License

This frontend is part of the TDS Virtual Teaching Assistant project.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Verify API connectivity
4. Open an issue on the GitHub repository
