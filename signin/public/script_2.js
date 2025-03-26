// Toggle the pickup date field visibility
function toggleDateField() {
    const dateContainer = document.getElementById('date-container');
    const noOption = document.getElementById('no').checked;

    dateContainer.style.display = noOption ? 'block' : 'none';
}

// Form validation before submission
function validateForm() {
    const noOption = document.getElementById('no').checked;
    const dateField = document.getElementById('pickup_date');

    if (noOption && !dateField.value) {
        alert('Please enter your preferred pickup date.');
        dateField.focus();
        return false;  // Prevent form submission
    }

    return true;  // Allow form submission if validation passes
}