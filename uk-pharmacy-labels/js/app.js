/**
 * UK Pharmacy Back-Up Label Generator
 * Main application file
 */

// Global array to store queued labels
let labelQueue = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the application
    initApp();
    
    // Initialize the medication manager
    await MedicationManager.init();
    
    // Set current date as default for dispensed date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dispensed-date').value = today;
    
    // Event listeners
    document.getElementById('preview-btn').addEventListener('click', generatePreview);
    document.getElementById('add-to-queue-btn').addEventListener('click', addToQueue);
    document.getElementById('print-queue-btn').addEventListener('click', printQueue);
    document.getElementById('clear-queue-btn').addEventListener('click', clearQueue);
    document.getElementById('label-form').addEventListener('reset', clearPreview);
    document.getElementById('new-patient-btn').addEventListener('click', clearPatientDetails);
    
    // Register the service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
});

/**
 * Initialize the application
 */
function initApp() {
    // Set default dispensary location if the element exists
    const dispensaryLocation = document.getElementById('dispensary-location');
    if (dispensaryLocation) {
        dispensaryLocation.value = 'south-tyneside';
    }
}

/**
 * Generate label preview based on form data
 */
function generatePreview() {
    // Get form data
    const formData = getFormData();
    
    // Generate label
    const labelContent = LabelGenerator.generateSingleLabel(formData);
    
    // Update preview
    const previewContainer = document.getElementById('preview-content');
    if (previewContainer) {
        previewContainer.innerHTML = labelContent;
        
        // Show message if content would be split across multiple labels when printed
        const labelPreviewSection = document.getElementById('label-preview');
        
        // Remove any existing warning
        const existingWarning = labelPreviewSection.querySelector('.split-label-warning');
        if (existingWarning) {
            existingWarning.remove();
        }
        
        if (LabelGenerator.needsMultipleLabels(formData)) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'split-label-warning';
            warningDiv.textContent = 'Note: This content will be split across multiple labels when printed';
            labelPreviewSection.appendChild(warningDiv);
        }
    }
}

/**
 * Add a label to the queue
 */
function addToQueue() {
    // Get form data
    const formData = getFormData();
    
    // Validate form data
    if (!formData.medicationName) {
        alert('Please enter a medication name');
        return;
    }
    
    if (!formData.dosageInstructions) {
        alert('Please enter dosage instructions');
        return;
    }
    
    // Add to queue
    labelQueue.push(formData);
    
    // Update queue display
    updateQueueDisplay();
    
    // Save patient details for reuse
    const patientName = document.getElementById('patient-name').value;
    const patientDOB = document.getElementById('patient-dob').value;
    const patientNHS = document.getElementById('patient-nhs').value;
    const patientAddress = document.getElementById('patient-address').value;
    
    // Clear only medication details
    clearMedicationDetails();
    clearPreview();
    
    // Restore patient details
    document.getElementById('patient-name').value = patientName;
    document.getElementById('patient-dob').value = patientDOB;
    document.getElementById('patient-nhs').value = patientNHS;
    document.getElementById('patient-address').value = patientAddress;
    
    // Set current date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dispensed-date').value = today;
}

/**
 * Update the queue display
 */
function updateQueueDisplay() {
    const queueContainer = document.getElementById('queue-container');
    
    // Clear container
    queueContainer.innerHTML = '';
    
    // Update count
    document.getElementById('queue-count').textContent = `(${labelQueue.length})`;
    
    // Enable/disable clear button
    document.getElementById('clear-queue-btn').disabled = labelQueue.length === 0;
    
    if (labelQueue.length === 0) {
        queueContainer.innerHTML = '<div class="queue-empty">No labels in queue</div>';
        return;
    }
    
    // Add labels to queue
    labelQueue.forEach((labelData, index) => {
        const queueItem = document.createElement('div');
        queueItem.className = 'queued-label';
        
        // Create label preview
        const labelPreview = document.createElement('div');
        labelPreview.className = 'queued-label-info';
        labelPreview.innerHTML = `
            <div class="queued-label-med">${labelData.medicationQuantity ? labelData.medicationQuantity + ' ' : ''}${labelData.medicationName} ${labelData.medicationFormulation || ''}</div>
            <div class="queued-label-patient">${labelData.patientName || 'No patient name'}</div>
        `;
        
        // Create remove button
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-label-btn';
        removeButton.textContent = '×';
        removeButton.addEventListener('click', () => removeFromQueue(index));
        
        // Add to queue item
        queueItem.appendChild(labelPreview);
        queueItem.appendChild(removeButton);
        
        // Add to queue container
        queueContainer.appendChild(queueItem);
    });
}

/**
 * Remove a label from the queue
 */
function removeFromQueue(index) {
    labelQueue.splice(index, 1);
    updateQueueDisplay();
}

/**
 * Clear the entire queue
 */
function clearQueue() {
    if (labelQueue.length === 0) return;
    
    if (confirm('Are you sure you want to clear all labels from the queue?')) {
        labelQueue = [];
        updateQueueDisplay();
    }
}

/**
 * Print all labels in the queue
 */
function printQueue() {
    if (labelQueue.length === 0) {
        alert('There are no labels in the queue to print');
        return;
    }
    
    // Create a print container if it doesn't exist
    let printContainer = document.getElementById('print-container');
    if (!printContainer) {
        printContainer = document.createElement('div');
        printContainer.id = 'print-container';
        document.body.appendChild(printContainer);
    }
    
    // Clear previous content
    printContainer.innerHTML = '';
    
    // Create a container for all the labels
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'print-labels-container';
    printContainer.appendChild(labelsContainer);
    
    // For tracking how many labels we've processed
    let labelCount = 0;
    
    // Process each label in the queue
    labelQueue.forEach(labelData => {
        // Check if we need to split this into multiple labels
        if (LabelGenerator.needsMultipleLabels(labelData)) {
            // Create multiple labels
            const splitLabels = createSplitLabels(labelData);
            splitLabels.forEach(label => {
                labelsContainer.appendChild(label);
                labelCount++;
            });
        } else {
            // Create a single label
            const label = createSingleLabel(labelData);
            labelsContainer.appendChild(label);
            labelCount++;
        }
    });
    
    // Position the print container off-screen during preparation
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.display = 'block';
    
    // Give browser time to render before printing
    setTimeout(() => {
        // Print
        window.print();
        
        // Ask if queue should be cleared after printing
        if (confirm(`${labelCount} labels printed. Do you want to clear the queue?`)) {
            labelQueue = [];
            updateQueueDisplay();
        }
    }, 500);
}

/**
 * Create a single printed label
 * @param {Object} labelData - Data for the label
 * @returns {HTMLElement} - The label element
 */
function createSingleLabel(labelData) {
    // Create the label container
    const label = document.createElement('div');
    label.className = 'print-label uk-label';
    
    // Generate the label content
    const content = LabelGenerator.generateSingleLabel(labelData);
    label.innerHTML = content;
    
    return label;
}

/**
 * Create multiple printed labels for split content
 * @param {Object} labelData - Data for the labels
 * @returns {Array} - Array of label elements
 */
function createSplitLabels(labelData) {
    const labels = [];
    
    // Generate all the label contents
    const contents = LabelGenerator.generateLabels(labelData);
    
    // Create a label element for each content
    contents.forEach(content => {
        const label = document.createElement('div');
        label.className = 'print-label uk-label';
        label.innerHTML = content;
        labels.push(label);
    });
    
    return labels;
}

/**
 * Clear the preview area
 */
function clearPreview() {
    const previewElement = document.getElementById('preview-content');
    previewElement.innerHTML = '<div class="preview-placeholder">Label preview will appear here</div>';
}

/**
 * Clear only medication details while preserving patient information
 */
function clearMedicationDetails() {
    // Clear medication fields
    document.getElementById('med-name').value = '';
    document.getElementById('med-form').value = 'tablets';
    document.getElementById('med-strength').value = '';
    document.getElementById('med-quantity').value = '';
    document.getElementById('dosage').value = '';
    document.getElementById('additional-info').value = '';
}

/**
 * Clear patient details when New Patient button is clicked
 */
function clearPatientDetails() {
    // Clear patient fields
    document.getElementById('patient-name').value = '';
    document.getElementById('patient-dob').value = '';
    document.getElementById('patient-nhs').value = '';
    document.getElementById('patient-address').value = '';
    
    // Also clear medication details
    clearMedicationDetails();
    
    // Clear preview
    clearPreview();
    
    // Focus on patient name field
    document.getElementById('patient-name').focus();
}

/**
 * Get all form data as an object
 */
function getFormData() {
    return {
        // Patient details
        patientName: document.getElementById('patient-name').value,
        patientDOB: document.getElementById('patient-dob').value,
        patientNHS: document.getElementById('patient-nhs').value,
        patientAddress: document.getElementById('patient-address').value,
        
        // Medication details
        medicationName: document.getElementById('med-name').value,
        medicationFormulation: document.getElementById('med-form').value,
        medicationStrength: document.getElementById('med-strength').value,
        medicationQuantity: document.getElementById('med-quantity').value,
        
        // Dosage
        dosageInstructions: document.getElementById('dosage').value,
        includeStandardWarning: document.getElementById('standard-warning').checked,
        additionalInformation: document.getElementById('additional-info').value,
        
        // Dispensing details
        dateOfDispensing: document.getElementById('dispensed-date').value,
        dispensaryLocation: document.getElementById('dispensary-location').value,
        showInitials: document.getElementById('show-initials').checked
    };
}