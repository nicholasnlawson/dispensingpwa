/**
 * Downtime Pharmacy Label Generator
 * Main application file
 */

// Global array to store queued labels
let labelQueue = [];

// Flag to track if we're in overlabel mode
let overlabelMode = false;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the medication manager
    await MedicationManager.init();
    
    // Set current date as default for dispensed date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dispensed-date').value = today;
    
    // Event listeners
    document.getElementById('add-to-queue-btn').addEventListener('click', addToQueue);
    document.getElementById('generate-bag-label-btn').addEventListener('click', generateBagLabel);
    document.getElementById('print-queue-btn').addEventListener('click', printQueue);
    document.getElementById('clear-queue-btn').addEventListener('click', clearQueue);
    document.getElementById('new-patient-btn').addEventListener('click', clearPatientDetails);
    document.getElementById('overlabels-btn').addEventListener('click', toggleOverlabelMode);
    
    // Initialize shorthand functionality when page loads
    LabelGenerator.initShorthand();
    
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

// Max characters for the medication name line on a label
const MED_NAME_MAX_CHARS = 38;

/**
 * Build the full medication line string from form data
 */
function buildMedLine(formData) {
    const parts = [];
    if (formData.medicationQuantity) parts.push(formData.medicationQuantity);
    if (formData.medicationName) parts.push(LabelGenerator.toTitleCase(formData.medicationName));
    if (formData.medicationStrength) parts.push(formData.medicationStrength);
    if (formData.medicationFormulation) parts.push(LabelGenerator.toTitleCase(formData.medicationFormulation));
    return parts.join(' ').trim();
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
    
    // Check if the medication line is too long
    const fullMedLine = buildMedLine(formData);
    
    if (fullMedLine.length > MED_NAME_MAX_CHARS) {
        // Look up all alternatives
        const result = MedicationManager.findShorterAlternatives(
            formData.medicationName,
            formData.medicationStrength,
            formData.medicationFormulation,
            formData.medicationQuantity,
            MED_NAME_MAX_CHARS
        );
        
        const hasAlternatives = result.formulationOptions.length > 0 ||
                                result.nameOptions.length > 0;
        
        if (hasAlternatives) {
            showAliasModal(formData, fullMedLine, result);
            return;
        }
    }
    
    // If no modal needed, proceed directly
    commitToQueue(formData);
}

/**
 * Build a preview line from selected name, strength, formulation, quantity
 */
function buildPreviewLine(name, strength, formulation, quantity) {
    const parts = [];
    if (quantity) parts.push(quantity);
    if (name) parts.push(LabelGenerator.toTitleCase(name));
    if (strength) parts.push(strength);
    if (formulation) parts.push(LabelGenerator.toTitleCase(formulation));
    return parts.join(' ').trim();
}

/**
 * Show the alias suggestion modal with two independent scrollable panels
 */
function showAliasModal(formData, currentFullLine, result) {
    const modal = document.getElementById('alias-modal');
    const currentDiv = document.getElementById('alias-modal-current');
    const formList = document.getElementById('alias-form-list');
    const nameList = document.getElementById('alias-name-list');
    const previewDiv = document.getElementById('alias-modal-preview');
    
    // Track current selections
    let selectedForm = formData.medicationFormulation;
    let selectedName = formData.medicationName;
    
    // Show current line info
    currentDiv.innerHTML = `
        <div class="alias-label">Current medication line:</div>
        <div class="alias-text">${currentFullLine}</div>
        <div class="alias-chars">${currentFullLine.length} characters (max ${MED_NAME_MAX_CHARS})</div>
    `;
    
    // Update the live preview
    function updatePreview() {
        const line = buildPreviewLine(selectedName, formData.medicationStrength, selectedForm, formData.medicationQuantity);
        const fits = line.length <= MED_NAME_MAX_CHARS;
        const statusClass = fits ? 'alias-preview-fits' : 'alias-preview-no-fit';
        const statusText = fits
            ? `Fits on one line (${line.length} chars)`
            : `Too long (${line.length} chars, max ${MED_NAME_MAX_CHARS})`;
        
        previewDiv.innerHTML = `
            <div class="alias-preview-label">Preview:</div>
            <div class="alias-preview-line">${line}</div>
            <div class="${statusClass}">${statusText}</div>
        `;
    }
    
    // Mark the selected item in a list
    function markSelected(listEl, value) {
        listEl.querySelectorAll('.alias-option').forEach(el => {
            el.classList.toggle('selected', el.dataset.value === value);
        });
    }
    
    // --- Populate formulation list ---
    formList.innerHTML = '';
    
    // Add current formulation as the first option
    const currentFormEl = document.createElement('div');
    currentFormEl.className = 'alias-option selected';
    currentFormEl.dataset.value = formData.medicationFormulation;
    currentFormEl.textContent = LabelGenerator.toTitleCase(formData.medicationFormulation);
    currentFormEl.addEventListener('click', () => {
        selectedForm = formData.medicationFormulation;
        markSelected(formList, formData.medicationFormulation);
        updatePreview();
    });
    formList.appendChild(currentFormEl);
    
    // Add all alternative formulations
    result.formulationOptions.forEach(opt => {
        const el = document.createElement('div');
        el.className = 'alias-option';
        el.dataset.value = opt;
        el.textContent = LabelGenerator.toTitleCase(opt);
        el.addEventListener('click', () => {
            selectedForm = opt;
            markSelected(formList, opt);
            updatePreview();
        });
        formList.appendChild(el);
    });
    
    // --- Populate drug name list ---
    nameList.innerHTML = '';
    
    // Add current name as the first option
    const currentNameEl = document.createElement('div');
    currentNameEl.className = 'alias-option selected';
    currentNameEl.dataset.value = formData.medicationName;
    currentNameEl.textContent = LabelGenerator.toTitleCase(formData.medicationName);
    currentNameEl.addEventListener('click', () => {
        selectedName = formData.medicationName;
        markSelected(nameList, formData.medicationName);
        updatePreview();
    });
    nameList.appendChild(currentNameEl);
    
    // Add all alternative names
    result.nameOptions.forEach(opt => {
        const el = document.createElement('div');
        el.className = 'alias-option';
        el.dataset.value = opt;
        el.textContent = LabelGenerator.toTitleCase(opt);
        el.addEventListener('click', () => {
            selectedName = opt;
            markSelected(nameList, opt);
            updatePreview();
        });
        nameList.appendChild(el);
    });
    
    // Initial preview
    updatePreview();
    
    // Wire up action buttons (clone to remove old listeners)
    const applyBtn = document.getElementById('alias-modal-apply');
    const proceedBtn = document.getElementById('alias-modal-proceed');
    const cancelBtn = document.getElementById('alias-modal-cancel');
    
    const newApplyBtn = applyBtn.cloneNode(true);
    applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
    const newProceedBtn = proceedBtn.cloneNode(true);
    proceedBtn.parentNode.replaceChild(newProceedBtn, proceedBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newApplyBtn.addEventListener('click', () => {
        // Update form fields with the selections
        document.getElementById('med-name').value = selectedName;
        document.getElementById('med-form').value = selectedForm;
        formData.medicationName = selectedName;
        formData.medicationFormulation = selectedForm;
        hideAliasModal();
        commitToQueue(formData);
    });
    
    newProceedBtn.addEventListener('click', () => {
        hideAliasModal();
        commitToQueue(formData);
    });
    
    newCancelBtn.addEventListener('click', () => {
        hideAliasModal();
    });
    
    // Show the modal
    modal.classList.add('visible');
}

/**
 * Hide the alias suggestion modal
 */
function hideAliasModal() {
    document.getElementById('alias-modal').classList.remove('visible');
}

/**
 * Commit form data to the queue (the actual add-to-queue logic)
 */
function commitToQueue(formData) {
    // Get number of labels to add (default to 1 if invalid)
    const numberOfLabels = formData.numberOfLabels || 1;
    
    // Add the label to the queue the specified number of times
    for (let i = 0; i < numberOfLabels; i++) {
        labelQueue.push({...formData});
    }
    
    // Update queue display
    updateQueueDisplay();
    
    // Provide feedback on how many labels were added
    if (numberOfLabels > 1) {
        alert(`${numberOfLabels} copies of this label have been added to the queue.`);
    }
    
    // Save patient details for reuse
    const patientName = document.getElementById('patient-name').value;
    const patientDOB = document.getElementById('patient-dob').value;
    const patientNHS = document.getElementById('patient-nhs').value;
    const patientAddress = document.getElementById('patient-address').value;
    
    // Clear only medication details
    clearMedicationDetails();
    
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
        const listItem = document.createElement('div');
        listItem.className = labelData.isBagLabel ? 'queue-item bag-label' : 'queue-item';
        
        if (labelData.isBagLabel) {
            // Bag label - show all patient details
            const dob = labelData.patientDOB ? new Date(labelData.patientDOB).toLocaleDateString('en-GB') : '';
            const addressFirstLine = (labelData.patientAddress || '').split(/\r?\n/)[0];
            listItem.innerHTML = `
                <div class="queue-label-type">Bag Label</div>
                <div class="queue-medication">${labelData.patientName || ''}</div>
                <div class="queue-details">DOB: ${dob}${labelData.patientNHS ? ` | NHS: ${labelData.patientNHS}` : ''}</div>
                ${addressFirstLine ? `<div class="queue-details">${addressFirstLine}</div>` : ''}
                <button class="remove-btn" data-index="${index}">Remove</button>
            `;
        } else {
            // Medication label - show all info including warnings
            const actualLabels = LabelGenerator.generateLabels(labelData);
            const splitNote = actualLabels.length > 1 ? ` <span class="queue-split-note">(splits across ${actualLabels.length} labels)</span>` : '';
            listItem.innerHTML = `
                <div class="queue-medication">${labelData.medicationQuantity ? labelData.medicationQuantity + ' ' : ''}${LabelGenerator.toTitleCase(labelData.medicationName)}${labelData.medicationStrength ? ' ' + labelData.medicationStrength : ''} ${LabelGenerator.toTitleCase(labelData.medicationFormulation || '')}${splitNote}</div>
                <div class="queue-dosage">${labelData.dosageInstructions || ''}</div>
                ${labelData.additionalInformation ? `<div class="queue-additional-info">${labelData.additionalInformation}</div>` : ''}
                <div class="queue-patient">${labelData.patientName || ''}${labelData.patientName && labelData.dateOfDispensing ? ' | ' : ''}${labelData.dateOfDispensing ? new Date(labelData.dateOfDispensing).toLocaleDateString('en-GB') : ''}</div>
                <button class="remove-btn" data-index="${index}">Remove</button>
            `;
        }
        
        queueContainer.appendChild(listItem);
        
        // Add click event to remove button
        listItem.querySelector('.remove-btn').addEventListener('click', () => {
            removeFromQueue(index);
        });
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
    
    // Ask user which label position to start from (1-24 on an A4 sheet)
    let startPosition = prompt('Enter the label number to start from (1-24):', '1');
    
    // Validate input
    startPosition = parseInt(startPosition);
    if (isNaN(startPosition) || startPosition < 1 || startPosition > 24) {
        alert('Please enter a valid number between 1 and 24');
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
    
    // Create all the label elements first
    const labelElements = [];
    
    // Process each label in the queue
    labelQueue.forEach(labelData => {
        if (labelData.isBagLabel) {
            // Handle bag label differently - they have a completely different format
            const bagLabel = document.createElement('div');
            bagLabel.className = 'print-label';
            bagLabel.innerHTML = LabelGenerator.generateBagLabel(labelData);
            labelElements.push(bagLabel);
            labelCount++;
        } else if (LabelGenerator.needsMultipleLabels(labelData)) {
            // Create multiple medication labels
            const splitLabels = createSplitLabels(labelData);
            splitLabels.forEach(label => {
                labelElements.push(label);
                labelCount++;
            });
        } else {
            // Create a single medication label
            const label = createSingleLabel(labelData);
            labelElements.push(label);
            labelCount++;
        }
    });
    
    // Calculate grid positions for labels
    // Each A4 sheet has 3 columns and 8 rows (24 labels total)
    
    // Add empty placeholders for labels that are already used
    for (let i = 1; i < startPosition; i++) {
        const emptyLabel = document.createElement('div');
        emptyLabel.className = 'print-label empty-label';
        labelsContainer.appendChild(emptyLabel);
    }
    
    // Add the actual labels
    labelElements.forEach(label => {
        labelsContainer.appendChild(label);
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
    
    // Generate the label content based on type
    let content;
    if (labelData.isBagLabel) {
        content = LabelGenerator.generateBagLabel(labelData);
    } else {
        content = LabelGenerator.generateSingleLabel(labelData);
    }
    
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
 * Clear only medication details while preserving patient information
 */
function clearMedicationDetails() {
    // Clear medication fields
    document.getElementById('med-name').value = '';
    document.getElementById('med-form').value = '';
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
    
    // Focus on patient name field
    document.getElementById('patient-name').focus();
}

/**
 * Toggle between normal and overlabel mode
 */
function toggleOverlabelMode() {
    // Toggle the mode
    overlabelMode = !overlabelMode;
    
    // Get references to patient detail fields
    const patientFields = [
        document.getElementById('patient-name'),
        document.getElementById('patient-dob'),
        document.getElementById('patient-nhs'),
        document.getElementById('patient-address')
    ];
    
    // Toggle button style
    const overlabelsBtn = document.getElementById('overlabels-btn');
    
    if (overlabelMode) {
        // Enable overlabel mode
        overlabelsBtn.classList.add('active');
        
        // Grey out and disable patient fields
        patientFields.forEach(field => {
            field.disabled = true;
            field.classList.add('disabled-field');
            field.value = ''; // Clear any existing values
        });
        
        // Show a message to indicate overlabel mode is active
        const patientSection = document.querySelector('.form-group');
        const existingMessage = document.getElementById('overlabel-message');
        
        if (!existingMessage) {
            const message = document.createElement('div');
            message.id = 'overlabel-message';
            message.className = 'info-message';
            message.textContent = 'Overlabel mode active: Patient information will be replaced with placeholder text for handwritten details';
            patientSection.insertBefore(message, patientSection.firstChild.nextSibling);
        }
    } else {
        // Disable overlabel mode
        overlabelsBtn.classList.remove('active');
        
        // Re-enable patient fields
        patientFields.forEach(field => {
            field.disabled = false;
            field.classList.remove('disabled-field');
        });
        
        // Remove the overlabel message
        const message = document.getElementById('overlabel-message');
        if (message) {
            message.remove();
        }
    }
    
}

/**
 * Generate a bag label with patient details
 */
function generateBagLabel() {
    // Validate patient data
    const patientName = document.getElementById('patient-name').value;
    const patientDOB = document.getElementById('patient-dob').value;
    const patientAddress = document.getElementById('patient-address').value;
    
    if (!patientName) {
        alert('Please enter the patient name');
        return;
    }
    
    if (!patientDOB) {
        alert('Please enter the patient date of birth');
        return;
    }
    
    // Get form data for the bag label
    const formData = getFormData();
    
    // Generate bag label
    const labelContent = LabelGenerator.generateBagLabel(formData);
    
    // Add to queue
    labelQueue.push({
        ...formData,
        isBagLabel: true
    });
    
    // Update queue display
    updateQueueDisplay();
}

/**
 * Get all form data as an object
 */
function getFormData() {
    return {
        // Overlabel mode flag
        isOverlabelMode: overlabelMode,
        // Patient details
        patientName: document.getElementById('patient-name').value.trim(),
        patientDOB: document.getElementById('patient-dob').value,
        patientNHS: document.getElementById('patient-nhs').value.trim(),
        patientAddress: document.getElementById('patient-address').value.trim(),
            
        // Medication details
        medicationName: document.getElementById('med-name').value.trim(),
        medicationFormulation: document.getElementById('med-form').value,
        medicationStrength: document.getElementById('med-strength').value.trim(),
        medicationQuantity: document.getElementById('med-quantity').value.trim(),
            
        // Number of labels to generate
        numberOfLabels: parseInt(document.getElementById('number-of-labels').value) || 1,
            
        // Dosage instructions
        dosageInstructions: document.getElementById('dosage').value.trim(),
        additionalInformation: document.getElementById('additional-info').value.trim(),
        standardWarning: document.getElementById('standard-warning').checked,
            
        // Dispensing details
        dateOfDispensing: document.getElementById('dispensed-date').value,
        dispensaryLocation: document.getElementById('dispensary-location').value,
        showInitials: document.getElementById('show-initials').checked
    };
}