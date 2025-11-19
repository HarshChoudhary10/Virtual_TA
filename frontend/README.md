# Virtual TA Frontend

A modern, responsive web interface for the TDS Virtual Teaching Assistant API.

## Features

- 💬 **Ask Questions**: Submit course-related questions and get AI-powered answers
- 🖼️ **Image Upload**: Upload screenshots for better context using OCR
- 🔗 **Source Links**: Every answer includes verifiable source references
- 🌓 **Dark Mode**: Toggle between light and dark themes
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 💾 **Chat History**: Automatically saves conversation history locally
- 📋 **Copy Answers**: Easily copy responses to clipboard

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
};
```

For local development with the API running on your machine:

```javascript
const CONFIG = {
    API_ENDPOINT: 'http://localhost:8000/query',
};
```

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
Click the moon/sun icon in the header to switch between light and dark modes. Your preference is saved automatically.

### Image Upload
- Click the 📎 icon to upload an image
- Supports common image formats (PNG, JPG, etc.)
- Maximum file size: 5MB
- Preview appears before sending
- Remove image by clicking the × button

### Chat History
- Conversations are saved automatically in browser storage
- History persists across sessions
- Click "Clear History" to delete saved conversations

### Copy to Clipboard
- Each assistant response has a "📋 Copy" button
- Click to copy the answer text
- Visual confirmation when copied successfully

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

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

### Image Upload Not Working

1. **Check file size** (must be under 5MB)
2. **Verify file type** (must be an image)
3. **Check browser console** for errors

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
    /* ... more variables */
}
```

**Add Features**: Extend functionality in `script.js`

**Modify Layout**: Update structure in `index.html`

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
