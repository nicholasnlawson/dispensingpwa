/**
 * Downtime Pharmacy Label Generator
 * Label Generator Module
 */

const LabelGenerator = {
    /**
     * Reference to the ShorthandCodes module
     * Moved to separate file for easier maintenance
     */
    
    /**
     * Initialize shorthand functionality
     */
    initShorthand() {
        const shorthandInput = document.getElementById('shorthand-input');
        const applyShorthandBtn = document.getElementById('apply-shorthand-btn');
        const dosageTextarea = document.getElementById('dosage');
        
        if (shorthandInput && applyShorthandBtn && dosageTextarea) {
            // Apply shorthand when button is clicked
            applyShorthandBtn.addEventListener('click', () => {
                const translatedText = this.translateShorthand(shorthandInput.value);
                if (translatedText) {
                    dosageTextarea.value = translatedText;
                    shorthandInput.value = '';
                }
            });
            
            // Apply shorthand when Enter key is pressed in the input field
            shorthandInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const translatedText = this.translateShorthand(shorthandInput.value);
                    if (translatedText) {
                        dosageTextarea.value = translatedText;
                        shorthandInput.value = '';
                    }
                }
            });
        }
    },
    
    /**
     * Translate shorthand text to full instructions
     * @param {string} shorthand - Shorthand text to translate
     * @returns {string} - Translated full text instructions
     */
    translateShorthand(shorthand) {
        if (!shorthand || shorthand.trim() === '') {
            return '';
        }
        
        // Trim for consistent processing
        const input = shorthand.trim();
        
        // Pre-process input to handle special formats
        // 1. Replace hyphens between codes with spaces (e.g., "1t-bd" becomes "1t bd")
        // 2. Preserve meaningful codes like "7/7" and numeric ranges
        // 3. Handle punctuation like commas after codes
        
        // First, preserve special patterns like "7/7" (days), "3/52" (weeks), etc.
        const preservePatterns = [
            { pattern: /(\d+)\/7/g, placeholder: '__DAYS__' },     // Days pattern (e.g., 7/7)
            { pattern: /(\d+)\/52/g, placeholder: '__WEEKS__' },   // Weeks pattern (e.g., 3/52)
            { pattern: /(\d+)\/12/g, placeholder: '__MONTHS__' },  // Months pattern (e.g., 6/12)
            { pattern: /(\d+)-(\d+)(t|c|p|d|ml)/g, placeholder: '__RANGE__' } // Dosage ranges (e.g., 1-2t)
        ];
        
        // Create a map to store original values
        const preservedValues = new Map();
        let processedInput = input;
        
        // Replace special patterns with placeholders to preserve them
        preservePatterns.forEach(({ pattern, placeholder }, index) => {
            processedInput = processedInput.replace(pattern, (match) => {
                const key = `${placeholder}_${index}_${Math.random().toString(36).substr(2, 5)}`;
                preservedValues.set(key, match);
                return key;
            });
        });
        
        // Now replace hyphens between potential codes with spaces
        // But be careful not to affect negative numbers or other valid uses of hyphens
        processedInput = processedInput.replace(/([a-z0-9])-((?![0-9])[a-z0-9])/gi, '$1 $2');
        
        // Restore preserved values
        preservedValues.forEach((value, key) => {
            processedInput = processedInput.replace(key, value);
        });
        
        // Check if we're dealing with a complex multi-part instruction with punctuation
        // e.g., "1t,bd" or "1t, bd" or "1t,bd,7/7"
        if (/[,;]/.test(processedInput)) {
            // Split the input by commas and semicolons, preserving the punctuation
            const segments = processedInput.split(/([,;])/).filter(s => s.trim());
            let result = '';
            
            // Process each segment and potential code
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i].trim();
                
                // Skip empty segments and isolated punctuation
                if (!segment || segment === ',' || segment === ';') {
                    continue;
                }
                
                // Try to translate the segment
                const translated = this._translateSingleComponent(segment);
                
                // Add to result with appropriate spacing and punctuation
                if (i > 0 && segments[i-1] && (segments[i-1] === ',' || segments[i-1] === ';')) {
                    // If the previous segment was punctuation, add it
                    result += segments[i-1] + ' ' + translated;
                } else if (result) {
                    // Otherwise just add with a space
                    result += ' ' + translated;
                } else {
                    // First segment
                    result = translated;
                }
            }
            
            return result || input; // Return original if no translation found
        }
        
        // For simpler cases without punctuation, just do the normal translation
        return this._translateSingleComponent(processedInput);
    },
    
    /**
     * Helper method to translate a single component of shorthand
     * @private
     * @param {string} component - The shorthand component to translate
     * @returns {string} - Translated component
     */
    _translateSingleComponent(component) {
        // Check if it's a direct match for a simple code
        const directMatch = ShorthandCodes.getFullText(component);
        if (directMatch) {
            return directMatch;
        }
        
        // Handle compound shorthand (e.g., "1t bd" = "Take ONE tablet TWICE a day")
        const parts = component.split(/\s+/);
        if (parts.length >= 2) {
            let result = '';
            
            // First part is usually dosage quantity
            const firstPart = ShorthandCodes.getFullText(parts[0]);
            if (firstPart) {
                result = firstPart;
            }
            
            // Second part is usually frequency
            const secondPart = ShorthandCodes.getFullText(parts[1]);
            if (secondPart) {
                result += result ? ' ' + secondPart : secondPart;
            }
            
            // Handle additional parts if present
            for (let i = 2; i < parts.length; i++) {
                const nextPart = ShorthandCodes.getFullText(parts[i]);
                if (nextPart) {
                    result += ' ' + nextPart;
                } else {
                    // If not a known shorthand, add as is
                    result += ' ' + parts[i];
                }
            }
            
            return result || component; // Return original if no translation found
        }
        
        // If no translation found, return original
        return component;
    },
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
        
        // Set very conservative thresholds to ensure instructions never overflow
        // As per client requirement: long instructions MUST be split across multiple labels
        const dosageThreshold = 60; // Very aggressive threshold for dosage instructions
        
        // Count the number of sentences in the dosage instructions
        const sentenceCount = (data.dosageInstructions || '').split('. ').length;
        
        // If dosage instructions exceed the threshold OR have multiple sentences, they should be split
        // This is key for ensuring instructions are properly split rather than truncated
        if (dosageLength > dosageThreshold || (dosageLength > 40 && sentenceCount > 1)) {
            return {
                needsSplitting: true,
                splitDosage: true, // Force splitting dosage
                splitWarnings: warningLength > 100 // Also split warnings if they're long
            };
        }
        
        // For shorter content with warnings, we still need to be careful
        const singleLabelThreshold = 150; // Much more conservative threshold
        
        // If total content is small enough, keep on one label
        if (totalContentLength <= singleLabelThreshold && dosageLength <= 60) {
            return {
                needsSplitting: false
            };
        }
        
        // For all other cases, we need to split content
        return {
            needsSplitting: true,
            splitDosage: dosageLength > 60,
            splitWarnings: warningLength > 100
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
        
        // We used to have a special case for exactly 2 labels here, but we've removed it to use
        // our more robust splitting algorithm for all label scenarios to ensure consistency
        
        // If we need to split the dosage instructions
        if (splitInfo.splitDosage || dosageLength > 60) { // Match the threshold from needsMultipleLabels
            // VERY SIMPLE APPROACH: Split every 3 lines with visual separations
            
            // Normalize all line breaks for consistent processing
            const normalizedContent = dosageContent.replace(/\r\n|\r/g, '\n');
            
            // Split the content into sentences for better readability
            // This regex splits on periods, question marks, and exclamation points followed by a space
            const sentences = normalizedContent.split(/([.!?]\s+)/).filter(s => s.trim());
            
            // Recombine the sentences with their punctuation
            const processedSentences = [];
            for (let i = 0; i < sentences.length; i += 2) {
                if (i + 1 < sentences.length) {
                    processedSentences.push(sentences[i] + sentences[i + 1].trim());
                } else {
                    processedSentences.push(sentences[i]);
                }
            }
            
            // Create an array to hold content for each label
            const dosageLabelContents = [];
            const MAX_LINES_PER_LABEL = 3; // Strictly enforce 3 lines per label
            
            // Hard-wrap text to create discrete lines of approximately equal length
            // Each line will be roughly 36-40 characters to ensure consistent row sizing
            const LINE_LENGTH = 36; // Optimal line length for pharmacy labels
            const wrappedLines = [];
            
            // Process each sentence and create visual lines
            for (const sentence of processedSentences) {
                if (sentence.trim() === '') continue; // Skip empty sentences
                
                // For very short sentences, use them as-is
                if (sentence.length <= LINE_LENGTH) {
                    wrappedLines.push(sentence);
                    continue;
                }
                
                // For longer sentences, break them into visual lines
                const words = sentence.split(/\s+/);
                let currentLine = '';
                
                for (const word of words) {
                    // If this word would make the line too long, start a new line
                    // Exception: if this is the first word on the line, keep it regardless of length
                    if (currentLine && (currentLine + ' ' + word).length > LINE_LENGTH) {
                        wrappedLines.push(currentLine); // Add completed line
                        currentLine = word; // Start new line with this word
                    } else {
                        // Add word to current line with appropriate spacing
                        currentLine = currentLine ? currentLine + ' ' + word : word;
                    }
                }
                
                // Add the final line if there's anything left
                if (currentLine) {
                    wrappedLines.push(currentLine);
                }
            }
            
            // Group into sets of EXACTLY 3 lines per label (strict enforcement)
            // This ensures each label has exactly 3 visual rows filled with content
            const labelGroups = [];
            
            for (let i = 0; i < wrappedLines.length; i += MAX_LINES_PER_LABEL) {
                // Get up to 3 lines for this label
                const labelLines = wrappedLines.slice(i, i + MAX_LINES_PER_LABEL);
                
                // If we don't have enough lines to fill 3 rows and this isn't the last group,
                // pad with empty lines to ensure exact 3-row layout
                while (labelLines.length < MAX_LINES_PER_LABEL && 
                      (i + MAX_LINES_PER_LABEL) < wrappedLines.length) {
                    labelLines.push(''); // Add empty line as placeholder to maintain visual structure
                }
                
                // For the last label, we don't add empty padding - just use whatever lines remain
                labelGroups.push(labelLines);
            }
            
            // Create the final label contents with explicit <br> tags for visual rows
            for (const group of labelGroups) {
                dosageLabelContents.push(group.join('<br>'));
            }
            
            // If we have a situation where all content fits on one label but we were told to split
            // (this would be rare but could happen with very few lines of text)
            if (dosageLabelContents.length === 1 && wrappedLines.length > 2) {
                // Try to find a good splitting point - preferably at a line break
                let contentStr = dosageLabelContents[0];
                let splitIndex = -1;
                
                // First try to split at a line break near the middle
                const midpoint = Math.floor(contentStr.length / 2);
                
                // Look for line breaks near the middle (within 20% of text length)
                const searchRange = Math.floor(contentStr.length * 0.2);
                
                for (let i = midpoint - searchRange; i <= midpoint + searchRange; i++) {
                    if (i > 0 && i < contentStr.length && contentStr[i] === '\n') {
                        splitIndex = i;
                        break;
                    }
                }
                
                // If no line break found, look for sentence end
                if (splitIndex === -1) {
                    const sentenceEndRegex = /[.!?]\s/g;
                    let match;
                    while ((match = sentenceEndRegex.exec(contentStr)) !== null) {
                        // If this sentence end is in the middle region
                        if (Math.abs(match.index - midpoint) < searchRange) {
                            splitIndex = match.index + 1; // Include the punctuation
                            break;
                        }
                    }
                }
                
                // If still no good split point, just split near the middle at a word boundary
                if (splitIndex === -1) {
                    // Find a space near the middle
                    for (let i = midpoint; i < contentStr.length; i++) {
                        if (contentStr[i] === ' ') {
                            splitIndex = i;
                            break;
                        }
                    }
                    
                    // If no space found after midpoint, look before
                    if (splitIndex === -1) {
                        for (let i = midpoint; i >= 0; i--) {
                            if (contentStr[i] === ' ') {
                                splitIndex = i;
                                break;
                            }
                        }
                    }
                }
                
                // If we found a splitting point
                if (splitIndex !== -1) {
                    const firstPart = contentStr.substring(0, splitIndex).trim();
                    const secondPart = contentStr.substring(splitIndex).trim();
                    
                    // Only split if both parts have content
                    if (firstPart && secondPart) {
                        dosageLabelContents[0] = firstPart;
                        dosageLabelContents.push(secondPart);
                    }
                }
            }
            
            // We'll try to combine dosage instructions and warnings where possible
            // Create a new set of combined labels
            const combinedLabels = [];
            
            // First check if we have warnings
            if (warningLength > 0) {
                // Process warnings into 3-line chunks like we did for dosage instructions
                // This helps maintain consistent formatting
                const normalizedWarning = warningText.replace(/\r\n|\r/g, '\n');
                const warningLines = [];
                
                // Split warnings into visual lines of 36 characters like we did for dosage
                const warningWords = normalizedWarning.split(/\s+/);
                let currentLine = '';
                
                for (const word of warningWords) {
                    if (currentLine && (currentLine + ' ' + word).length > LINE_LENGTH) {
                        warningLines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = currentLine ? currentLine + ' ' + word : word;
                    }
                }
                
                if (currentLine) {
                    warningLines.push(currentLine);
                }
                
                // For each dosage content, try to add warnings if space allows
                for (let i = 0; i < dosageLabelContents.length; i++) {
                    const dosageContent = dosageLabelContents[i];
                    const dosageLines = dosageContent.split('<br>').filter(line => line.trim());
                    
                    // Count how many lines of dosage content we have on this label
                    const dosageLineCount = dosageLines.length;
                    
                    // Check if we can fit at least one line of warnings on this label
                    // We need at least one free line slot (of the 3 max) to add warnings
                    if (dosageLineCount < MAX_LINES_PER_LABEL && warningLines.length > 0) {
                        // We can fit some warnings on this label
                        // Calculate how many warning lines we can add
                        const availableLines = MAX_LINES_PER_LABEL - dosageLineCount;
                        const warningLinesToAdd = Math.min(availableLines, warningLines.length);
                        
                        // Get the warning lines we can add
                        const warningLinesToInclude = warningLines.splice(0, warningLinesToAdd);
                        
                        // Create a combined label with both dosage and warnings
                        combinedLabels.push({
                            dosageContent: dosageContent,
                            warningContent: warningLinesToInclude.join('<br>')
                        });
                    } else {
                        // Can't fit warnings on this label, just add the dosage content
                        combinedLabels.push({
                            dosageContent: dosageContent,
                            warningContent: ''
                        });
                    }
                }
                
                // If we still have warning lines left, add them to their own labels
                if (warningLines.length > 0) {
                    // Group remaining warnings into sets of 3 lines per label
                    for (let i = 0; i < warningLines.length; i += MAX_LINES_PER_LABEL) {
                        const labelWarningLines = warningLines.slice(i, i + MAX_LINES_PER_LABEL);
                        combinedLabels.push({
                            dosageContent: '',
                            warningContent: labelWarningLines.join('<br>')
                        });
                    }
                }
            } else {
                // No warnings, just add dosage content
                for (let i = 0; i < dosageLabelContents.length; i++) {
                    combinedLabels.push({
                        dosageContent: dosageLabelContents[i],
                        warningContent: ''
                    });
                }
            }
            
            // Create the final labels from our combined content
            if (combinedLabels.length > 0) {
                const totalLabels = combinedLabels.length;
                
                // Create labels for each content portion
                for (let i = 0; i < combinedLabels.length; i++) {
                    const item = combinedLabels[i];
                    let contentDiv = '';
                    
                    // Add dosage content if present
                    if (item.dosageContent) {
                        contentDiv += `<div class="dosage-instructions">${item.dosageContent}</div>`;
                    }
                    
                    // Add warning content if present
                    if (item.warningContent) {
                        contentDiv += `<div class="additional-info">${item.warningContent}</div>`;
                    }
                    
                    labels.push(this.createLabelHtml({
                        medicationFull,
                        medicationQuantity: data.medicationQuantity,
                        mainContent: contentDiv,
                        mainContentClass: 'content-wrapper',
                        labelNumber: i + 1,
                        totalLabels: totalLabels,
                        patientName: data.patientName,
                        date,
                        dispensary
                    }));
                }
                
                return labels;
            }
            
            // Fallback method if the above approach didn't work
            // This code will only run if we couldn't create a good split above
            const words2 = dosageContent.split(/\s+/);
            const halfwayPoint = Math.ceil(words2.length / 2);
            
            // Use the word-based split as our final content
            const firstHalf = words2.slice(0, halfwayPoint).join(' ');
            const secondHalf = words2.slice(halfwayPoint).join(' ');
            
            // First label: First half of dosage
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: `<div class="dosage-instructions">${firstHalf}</div>`,
                mainContentClass: 'content-wrapper',
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
                mainContent: `<div class="dosage-instructions">${secondHalf}</div>`,
                mainContentClass: 'content-wrapper',
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
                mainContent: `<div class="dosage-instructions">${dosageContent}</div>`,
                mainContentClass: 'content-wrapper',
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
                mainContent: `<div class="additional-info">${warningText}</div>`,
                mainContentClass: 'content-wrapper',
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
                mainContent: `<div class="additional-info">${firstHalf}</div>`,
                mainContentClass: 'content-wrapper',
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
                mainContent: `<div class="additional-info">${secondHalf}</div>`,
                mainContentClass: 'content-wrapper',
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
                mainContent: `<div class="additional-info">${warningText}</div>`,
                mainContentClass: 'content-wrapper',
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
                
                <!-- Row 2: Dosage Instructions (always in large font) -->
                <div class="dosage-instructions">
                    ${data.dosageInstructions || ''}
                </div>
                
                <!-- Row 3: Warnings and Additional Information (always in smaller font) -->
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
