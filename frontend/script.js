function handleQuestionSubmit(event) {
    event.preventDefault();
    const questionInput = document.getElementById('questionInput').value;
    const imageInput = document.getElementById('imageInput').files[0];
    let questionText = questionInput.trim();

    if (imageInput && !questionText) {
        questionText = 'What is in this image?';
    }

    if (questionText || imageInput) {
        // Submission logic here...
        console.log('Question submitted:', questionText);
        if (imageInput) {
            // Handle the image upload as well...
            console.log('Image submitted:', imageInput.name);
        }
    } else {
        console.error('No question or image provided.');
    }
}