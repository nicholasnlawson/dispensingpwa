/**
 * UK Pharmacy Back-Up Label Generator
 * Label Generator Module
 */

const LabelGenerator = {
    /**
     * Generate labels based on the form data
     * @param {Object} data - Form data
     * @returns {Array} - Array of HTML content for the labels
     */
    generateLabels(data) {
        // Check if content needs to be split across multiple labels
        const needsSplitting = this.needsMultipleLabels(data);
        
        if (needsSplitting) {
            return this.generateSplitLabels(data);
        } else {
            return [this.generateSingleLabel(data)];
        }
    },

    /**
     * Check if content needs to be split across multiple labels
     * @param {Object} data - Form data
     * @returns {Object} - Object with details about what needs splitting
     */
    needsMultipleLabels(data) {
        // Calculate approximate content length
        const medicationLength = (data.medicationName || '').length + 
                               (data.medicationStrength || '').length + 
                               (data.medicationFormulation || '').length;
        const dosageLength = (data.dosageInstructions || '').length;
        const warningsLength = (data.additionalInformation ? data.additionalInformation.length + 40 : 40); // Add length for standard warning
        
        // Thresholds based on testing - these can be adjusted
        // Higher thresholds to fit more content per label
        const MAX_MEDICATION_LENGTH = 60;
        const MAX_DOSAGE_LENGTH = 100;
        const MAX_WARNINGS_LENGTH = 130;
        
        // Check combined content length
        const totalContentLength = dosageLength + warningsLength;
        
        // Only split if we really need to
        if (totalContentLength <= 180) {
            // Can fit everything on one label
            return false;
        }
        
        // Check if we need to split content
        return true;
    },

    /**
     * Generate split labels for long content
     * @param {Object} data - Form data
     * @returns {Array} - Array of HTML content for the labels
     */
    generateSplitLabels(data) {
        const labels = [];
        const dispensary = DataManager.getDispensaryInfo(data.dispensaryLocation);
        const date = data.dateOfDispensing ? new Date(data.dateOfDispensing).toLocaleDateString('en-GB') : '';
        
        // Format medication name, strength and formulation
        const medicationStrength = data.medicationStrength ? `${data.medicationStrength} ` : '';
        const medicationFull = `${data.medicationName || ''} ${medicationStrength}${data.medicationFormulation || ''}`;
        
        // Add standard warning
        const standardWarning = 'Keep out of the reach and sight of children.';
        let warningText = data.additionalInformation || '';
        if (warningText) {
            warningText = `${standardWarning} ${warningText}`;
        } else {
            warningText = standardWarning;
        }
        
        // Calculate which fields need to be split
        const dosageLength = (data.dosageInstructions || '').length;
        const warningLength = warningText.length;
        const totalContentLength = dosageLength + warningLength;
        
        // Determine how many labels we need - always try to use just 2 labels
        let totalLabels = 2;
        
        // Only use 3 labels for extremely long content
        if (dosageLength > 150 && warningLength > 150) {
            totalLabels = 3;
        }
        
        // First label: Always medication name and dosage instructions (or first part)
        let dosageContent = data.dosageInstructions || '';
        
        // Try to fit dosage and some warnings on first label if possible
        if (totalLabels === 2 && totalContentLength <= 220) {
            // Calculate how much of the warnings we can include
            // Try to include complete sentences or at least complete words
            let warningPreviewLength = Math.min(100, warningLength);
            
            // Find the last complete sentence that fits
            let lastSentenceEnd = warningText.lastIndexOf('. ', warningPreviewLength) + 1;
            
            // If no sentence break, find the last complete word
            if (lastSentenceEnd <= 1) {
                lastSentenceEnd = warningText.lastIndexOf(' ', warningPreviewLength) + 1;
            }
            
            // If we found a good break point, use it
            if (lastSentenceEnd > 1) {
                warningPreviewLength = lastSentenceEnd;
            }
            
            // Create the combined content with a preview of warnings
            const warningPreview = warningText.substring(0, warningPreviewLength).trim();
            const combinedContent = `${dosageContent}\n\n${warningPreview}${warningPreviewLength < warningLength ? '...' : ''}`;
            
            
            // First label: All dosage and start of warnings
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: combinedContent,
                mainContentClass: 'combined-content',
                labelNumber: 1,
                totalLabels,
                patientName: data.patientName,
                date,
                dispensary
            }));
            
            // Second label: Full warnings
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: warningText,
                mainContentClass: 'additional-info',
                labelNumber: 2,
                totalLabels,
                patientName: data.patientName,
                date,
                dispensary
            }));
            
            return labels;
        }
        
        // If we need to split the dosage instructions (only for very long content)
        if (dosageLength > 150 && totalLabels === 3) {
            // Split dosage instructions if they're very long
            const midpoint = Math.floor(dosageLength / 2);
            
            // Try to maximize content on first label while keeping complete sentences
            const maxFirstLabelChars = Math.floor(dosageLength * 0.6); // Try to fit 60% on first label
            
            // Find the last complete sentence that fits within our target length
            let splitPoint = dosageContent.lastIndexOf('. ', maxFirstLabelChars) + 1;
            
            // If no good sentence break, find a phrase break
            if (splitPoint <= 1) {
                splitPoint = dosageContent.lastIndexOf(', ', maxFirstLabelChars) + 1;
            }
            
            // If still no good break, find the last complete word that fits
            if (splitPoint <= 1) {
                // Try to find the last word that fits completely
                let wordEnd = 0;
                let position = 0;
                
                // Find the last word break that fits in our target length
                while (position < maxFirstLabelChars && position !== -1) {
                    position = dosageContent.indexOf(' ', position + 1);
                    if (position !== -1 && position <= maxFirstLabelChars) {
                        wordEnd = position + 1; // +1 to include the space
                    }
                }
                
                if (wordEnd > 0) {
                    splitPoint = wordEnd;
                } else {
                    // Last resort: use a reasonable percentage of the text
                    splitPoint = Math.max(maxFirstLabelChars, 100);
                }
            }
            
            const firstHalf = dosageContent.substring(0, splitPoint).trim();
            const secondHalf = dosageContent.substring(splitPoint).trim();
            
            // First label: First half of dosage
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: firstHalf,
                mainContentClass: 'dosage-instructions',
                labelNumber: 1,
                totalLabels,
                patientName: data.patientName,
                date,
                dispensary
            }));
            
            // Second label: Second half of dosage
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: secondHalf,
                mainContentClass: 'dosage-instructions',
                labelNumber: 2,
                totalLabels,
                patientName: data.patientName,
                date,
                dispensary
            }));
        } else {
            // First label: All dosage instructions
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: dosageContent,
                mainContentClass: 'dosage-instructions',
                labelNumber: 1,
                totalLabels,
                patientName: data.patientName,
                date,
                dispensary
            }));
        }
        
        // Last label: Warnings (or split warnings if we already have 2 labels)
        if (totalLabels === 3 && labels.length === 2) {
            // Third label: All warnings
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: warningText,
                mainContentClass: 'additional-info',
                labelNumber: 3,
                totalLabels,
                patientName: data.patientName,
                date,
                dispensary
            }));
        } else if (warningLength > 120 && totalLabels === 3) {
            // Split warnings if they're very long and we're using label 2 of 3
            const midpoint = Math.floor(warningLength / 2);
            
            // Try to maximize content on first label while keeping complete sentences
            const maxFirstLabelChars = Math.floor(warningLength * 0.6); // Try to fit 60% on first label
            
            // Find the last complete sentence that fits within our target length
            let splitPoint = warningText.lastIndexOf('. ', maxFirstLabelChars) + 1;
            
            // If no good sentence break, find a phrase break
            if (splitPoint <= 1) {
                splitPoint = warningText.lastIndexOf(', ', maxFirstLabelChars) + 1;
            }
            
            // If still no good break, find the last complete word that fits
            if (splitPoint <= 1) {
                // Try to find the last word that fits completely
                let wordEnd = 0;
                let position = 0;
                
                // Find the last word break that fits in our target length
                while (position < maxFirstLabelChars && position !== -1) {
                    position = warningText.indexOf(' ', position + 1);
                    if (position !== -1 && position <= maxFirstLabelChars) {
                        wordEnd = position + 1; // +1 to include the space
                    }
                }
                
                if (wordEnd > 0) {
                    splitPoint = wordEnd;
                } else {
                    // Last resort: use a reasonable percentage of the text
                    splitPoint = Math.max(maxFirstLabelChars, 100);
                }
            }
            
            const firstHalf = warningText.substring(0, splitPoint).trim();
            const secondHalf = warningText.substring(splitPoint).trim();
            
            // Second label: First half of warnings
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: firstHalf,
                mainContentClass: 'additional-info',
                labelNumber: 2,
                totalLabels,
                patientName: data.patientName,
                date,
                dispensary
            }));
            
            // Third label: Second half of warnings
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: secondHalf,
                mainContentClass: 'additional-info',
                labelNumber: 3,
                totalLabels,
                patientName: data.patientName,
                date,
                dispensary
            }));
        } else {
            // Just one label for warnings
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: warningText,
                mainContentClass: 'additional-info',
                labelNumber: labels.length + 1,
                totalLabels,
                patientName: data.patientName,
                date,
                dispensary
            }));
        }
        
        return labels;
    },

    /**
     * Create HTML for a single label in a multi-label set
     * @param {Object} options - Options for the label
     * @returns {string} - HTML content for the label
     */
    createLabelHtml(options) {
        const {
            medicationFull,
            medicationQuantity,
            mainContent,
            mainContentClass,
            labelNumber,
            totalLabels,
            patientName,
            date,
            dispensary
        } = options;
        
        return `
            <div class="label-content">
                <!-- Initial boxes for dispenser and checker -->
                <div class="initials-boxes">
                    <div class="initials-box"></div>
                    <div class="initials-box"></div>
                </div>
                
                <!-- Top Section: Medication info and main content -->
                <div class="label-top-section">
                    <!-- Row 1: Quantity, Medication Name, Strength, Formulation -->
                    <div class="medication">
                        <div class="med-name">${medicationQuantity ? `${medicationQuantity} ` : ''}${medicationFull}</div>
                    </div>
                    
                    <!-- Row 2: Main Content (Dosage or Warnings) -->
                    <div class="${mainContentClass}">
                        ${mainContent}
                    </div>
                </div>
                
                <!-- Bottom Section: Patient info and pharmacy details -->
                <div class="label-bottom-section">
                    <!-- Row 4: Patient Name, Date -->
                    <div class="patient-row">
                        <span class="patient-name">${patientName || ''}</span>
                        <span class="dispensing-date">${date}</span>
                    </div>
                    
                    <!-- Label Number at Bottom -->
                    <div class="split-label-info">
                        <span class="label-number">Label ${labelNumber} of ${totalLabels}</span>
                    </div>
                    
                    <!-- Bottom Row: Pharmacy Details -->
                    <div class="pharmacy-details">
                        ${dispensary.name}, ${dispensary.address}, Tel: ${dispensary.phone}
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Generate a single label based on the form data
     * @param {Object} data - Form data
     * @returns {string} - HTML content for the label
     */
    generateLabel(data) {
        return this.generateSingleLabel(data);
    },

    /**
     * Generate a single label based on the form data
     * @param {Object} data - Form data
     * @returns {string} - HTML content for the label
     */
    generateSingleLabel(data) {
        // Format medication name, strength and formulation
        const medicationStrength = data.medicationStrength ? `${data.medicationStrength} ` : '';
        const medicationFull = `${data.medicationName || ''} ${medicationStrength}${data.medicationFormulation || ''}`;
        
        // Get dispensary information
        const dispensary = DataManager.getDispensaryInfo(data.dispensaryLocation);
        
        // Format date
        const date = data.dateOfDispensing ? new Date(data.dateOfDispensing).toLocaleDateString('en-GB') : '';
        
        // Add standard warning
        const standardWarning = 'Keep out of the reach and sight of children.';
        const warningText = data.additionalInformation ? 
            `${standardWarning} ${data.additionalInformation}` : 
            standardWarning;
        
        // Generate HTML for the label
        return `
            <div class="label-content">
                <!-- Initial boxes for dispenser and checker -->
                <div class="initials-boxes">
                    <div class="initials-box"></div>
                    <div class="initials-box"></div>
                </div>
                
                <!-- Top Section: Medication info, instructions, warnings -->
                <div class="label-top-section">
                    <!-- Row 1: Quantity, Medication Name, Strength, Formulation -->
                    <div class="medication">
                        <div class="med-name">${data.medicationQuantity ? `${data.medicationQuantity} ` : ''}${medicationFull}</div>
                    </div>
                    
                    <!-- Row 2: Dosage Instructions -->
                    <div class="dosage-instructions">
                        ${data.dosageInstructions || ''}
                    </div>
                    
                    <!-- Row 3: Warning Labels -->
                    <div class="additional-info">
                        ${warningText}
                    </div>
                </div>
                
                <!-- Bottom Section: Patient info and pharmacy details -->
                <div class="label-bottom-section">
                    <!-- Row 4: Patient Name, Date -->
                    <div class="patient-row">
                        <span class="patient-name">${data.patientName || ''}</span>
                        <span class="dispensing-date">${date}</span>
                    </div>
                    
                    <!-- Bottom Row: Pharmacy Details -->
                    <div class="pharmacy-details">
                        ${dispensary.name}, ${dispensary.address}, Tel: ${dispensary.phone}
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Format a date string to UK format (DD/MM/YYYY)
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },
    
    /**
     * Format NHS Number with spaces (e.g., 123 456 7890)
     * @param {string} nhsNumber 
     * @returns {string} Formatted NHS number
     */
    formatNHSNumber(nhsNumber) {
        if (!nhsNumber) return '';
        
        // Remove any non-digit characters
        const digits = nhsNumber.replace(/\D/g, '');
        
        // Format as XXX XXX XXXX
        if (digits.length === 10) {
            return `${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
        }
        
        return nhsNumber; // Return original if not 10 digits
    },
    
    /**
     * Create a formatted medication string
     * @param {Object} data - The form data
     * @returns {string} Formatted medication string
     */
    formatMedication(data) {
        let result = data.medicationName;
        
        if (data.medicationStrength) {
            result += ` ${data.medicationStrength}`;
        }
        
        if (data.medicationForm) {
            result += ` ${data.medicationForm}`;
        }
        
        return result;
    },
    
    /**
     * Get standard UK medication warnings
     * @returns {string} HTML for standard warnings
     */
    getStandardWarnings() {
        return `
            <div class="warning">
                Keep out of the reach and sight of children.
            </div>
        `;
    },
    
    /**
     * Get HTML for dispensing and checking initials boxes
     * @returns {string} HTML for initials boxes
     */
    getInitialsBoxes() {
        return `
            <div class="initials-boxes">
                <div class="initials-box">
                    <div class="box-label">Disp</div>
                    <div class="box"></div>
                </div>
                <div class="initials-box">
                    <div class="box-label">Check</div>
                    <div class="box"></div>
                </div>
            </div>
        `;
    },
    /**
     * Generate a complete set of labels for printing on A4 page
     * @param {Object} data - The form data
     * @param {number} quantity - Number of labels to generate (max 24 per page)
     * @returns {string} - HTML for the A4 page of labels
     */
    generateLabelsForPrinting(data, quantity = 1) {
        // Ensure quantity is within limits (max 24 labels per A4 sheet)
        const labelCount = Math.min(quantity, 24);
        
        // Generate the single label HTML content
        const labelContent = this.generateLabel(data);
        
        // Create container for all labels
        let html = '<div class="print-labels-container">';
        
        // Add the required number of labels
        for (let i = 0; i < labelCount; i++) {
            html += `<div class="print-label uk-label">${labelContent}</div>`;
        }
        
        html += '</div>';
        
        return html;
    }
};
