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
        const splitInfo = this.needsMultipleLabels(data);
        
        if (splitInfo.needsSplitting) {
            return this.generateSplitLabels(data, splitInfo);
        } else {
            return [this.generateSingleLabel(data)];
        }
    },

    /**
     * Check if content needs to be split across multiple labels
     * @param {Object} data - Form data
     * @returns {Object} - Object with details about what needs splitting and how
     */
    needsMultipleLabels(data) {
        // Calculate approximate content length
        const medicationLength = (data.medicationName || '').length + 
                               (data.medicationStrength || '').length + 
                               (data.medicationFormulation || '').length;
        const dosageLength = (data.dosageInstructions || '').length;
        const warningLength = (data.additionalInformation ? data.additionalInformation.length : 0);
        
        // Check combined content length for normal splitting
        const totalContentLength = dosageLength + warningLength;
        
        // Varying thresholds based on content type and length
        // For content with shorter warnings, we can fit more on one label
        const singleLabelThreshold = warningLength > 150 ? 250 : 320;
        
        // Higher threshold to try to fit more on a single label
        if (totalContentLength <= singleLabelThreshold) {
            // Can fit everything on one label
            return {
                needsSplitting: false
            };
        }
        
        // Check if any single field is extremely long and needs its own dedicated label
        const longDosage = dosageLength > 180;
        const longWarnings = warningLength > 180;
        
        // If either field needs its own label, we definitely need to split
        if (longDosage || longWarnings) {
            return {
                needsSplitting: true,
                splitDosage: longDosage,
                splitWarnings: longWarnings
            };
        }
        
        // Need to split but no single field needs a dedicated label
        return {
            needsSplitting: true,
            splitDosage: false,
            splitWarnings: false
        };
    },

    /**
     * Generate split labels for long content
     * @param {Object} data - Form data
     * @param {Object} splitInfo - Information about how to split the content
     * @returns {Array} - Array of HTML content for the labels
     */
    generateSplitLabels(data, splitInfo) {
        const labels = [];
        const dispensary = DataManager.getDispensaryInfo(data.dispensaryLocation);
        const date = data.dateOfDispensing ? new Date(data.dateOfDispensing).toLocaleDateString('en-GB') : '';
        
        // Format medication name, strength and formulation
        const medicationStrength = data.medicationStrength ? `${data.medicationStrength} ` : '';
        const medicationFull = `${data.medicationName || ''} ${medicationStrength}${data.medicationFormulation || ''}`;
        
        // Get warning text from additional information field (already includes standard warning if enabled)
        let warningText = data.additionalInformation || '';
        
        // Calculate which fields need to be split
        const dosageLength = (data.dosageInstructions || '').length;
        const warningLength = warningText.length;
        const totalContentLength = dosageLength + warningLength;
        
        // Determine how many labels we need based on content length
        let totalLabels = 2;
        
        // If both dosage and warnings need their own labels, we need 3 labels
        if (splitInfo.splitDosage && splitInfo.splitWarnings) {
            totalLabels = 3;
        } else if (splitInfo.splitDosage || splitInfo.splitWarnings) {
            // If either one needs its own label, we still need at least 2 labels
            totalLabels = 2;
        }
        
        // For extremely long content in both fields
        if (dosageLength > 180 && warningLength > 180) {
            totalLabels = 4; // In extreme cases, use up to 4 labels
        }
        
        // First label: Always medication name and dosage instructions (or first part)
        let dosageContent = data.dosageInstructions || '';
        
        // Try to fit more content on a single label before splitting
        if (totalLabels === 2) {
            // Try to combine both dosage and warnings on first label if length is reasonable
            const combinedContent = dosageLength + warningLength <= 280 ? 
                `${dosageContent}\n\n${warningText}` : dosageContent;
            
            
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
        
        // If we need to split the dosage instructions
        if (splitInfo.splitDosage || dosageLength > 150) {
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
        
        // Handle warnings - may need to split across multiple labels
        if (splitInfo.splitWarnings || warningLength > 150) {
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
     * Generate a bag label with patient details
     * @param {Object} data - Form data with patient details
     * @returns {string} - HTML content for the bag label
     */
    generateBagLabel(data) {
        // Get dispensary information
        const dispensary = DataManager.getDispensaryInfo(data.dispensaryLocation);
        
        // Format date of birth
        const dobDate = data.patientDOB ? new Date(data.patientDOB) : null;
        const dob = dobDate ? dobDate.toLocaleDateString('en-GB') : '';
        
        // Format dispensing date
        const dispensedDate = data.dateOfDispensing ? new Date(data.dateOfDispensing).toLocaleDateString('en-GB') : '';
        
        // Generate HTML for the bag label - compact format for small labels
        return `
            <div class="bag-label">
                <!-- Patient Information Section -->
                <div class="bag-label-patient-section">
                    <div class="bag-label-patient-name">${data.patientName || ''}</div>
                    <div class="bag-label-patient-details">
                        <div>DOB: ${dob}</div>
                        ${data.patientNHS ? `<div>NHS: ${data.patientNHS}</div>` : ''}
                    </div>
                    <div class="bag-label-patient-address">${data.patientAddress || ''}</div>
                </div>
                
                <!-- Dispensary Information -->
                <div class="bag-label-dispensary">
                    <div class="bag-label-date">Date: ${dispensedDate}</div>
                    <div class="bag-label-pharmacy">${dispensary.name}</div>
                </div>
            </div>
        `;
    },

    /**
     * Generate a single label based on the form data
     * @param {Object} data - Form data
     * @returns {string} - HTML content for the label
     */
    generateSingleLabel(data) {
        // Get dispensary information
        const dispensary = DataManager.getDispensaryInfo(data.dispensaryLocation);
        
        // Format date
        const date = data.dateOfDispensing ? new Date(data.dateOfDispensing).toLocaleDateString('en-GB') : '';
        
        // Format medication name, strength and formulation
        const medicationStrength = data.medicationStrength ? `${data.medicationStrength} ` : '';
        const medicationFull = `${data.medicationName || ''} ${medicationStrength}${data.medicationFormulation || ''}`;
        
        // Check content length to prevent overflow
        const dosageLength = (data.dosageInstructions || '').length;
        const warningsLength = (data.additionalInformation || '').length;
        const totalContentLength = dosageLength + warningsLength;
        
        // If content is too long, we should split into multiple labels instead
        if (totalContentLength > 350) {
            return this.generateSplitLabels(data, { needsSplitting: true })[0];
        }
        
        // Generate HTML for the label
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
                        <div class="med-name">${data.medicationQuantity ? `${data.medicationQuantity} ` : ''}${medicationFull}</div>
                    </div>
                    
                    <!-- Row 2: Dosage Instructions -->
                    <div class="dosage-instructions">
                        ${data.dosageInstructions || ''}
                    </div>
                    
                    <!-- Row 3: Warnings and Additional Information -->
                    ${data.additionalInformation ? `
                    <div class="additional-info">
                        ${data.additionalInformation || ''}
                    </div>` : ''}
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
