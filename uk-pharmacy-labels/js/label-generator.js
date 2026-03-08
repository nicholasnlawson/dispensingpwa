/**
 * Downtime Pharmacy Label Generator
 * Label Generator Module
 */

const LabelGenerator = {
    /**
     * Convert a string to title case (capitalize first letter of each word)
     * @param {string} str - String to convert
     * @returns {string} - Title-cased string
     */
    // Common pharmaceutical abbreviations that should remain uppercase
    _pharmaAbbreviations: new Set([
        'mr', 'sr', 'cr', 'xl', 'la', 'pr', 'er', 'ec', 'gr', 'dr',
        'sl', 'iv', 'im', 'sc', 'td', 'dpi', 'mdi', 'smi',
        'pf', 'sf', 'fc', 'bp', 'nac', 'hgc', 'sgc', 'od'
    ]),

    toTitleCase(str) {
        if (!str) return '';
        return str.replace(/\b(\w+)\b/g, (word) => {
            // Preserve words already all-uppercase (e.g. user typed "MR")
            if (word.length >= 2 && word === word.toUpperCase() && /^[A-Z]+$/.test(word)) {
                return word;
            }
            // Uppercase known pharmaceutical abbreviations
            if (this._pharmaAbbreviations.has(word.toLowerCase())) {
                return word.toUpperCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        });
    },
    
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
        // Build the full medication line to check if it needs name splitting
        const medName = this.toTitleCase(data.medicationName || '');
        const medStrength = data.medicationStrength ? `${data.medicationStrength} ` : '';
        const medForm = this.toTitleCase(data.medicationFormulation || '');
        const qtyPrefix = data.medicationQuantity ? `${data.medicationQuantity} ` : '';
        const fullMedLine = `${qtyPrefix}${medName} ${medStrength}${medForm}`.trim();
        
        // Max characters that fit on the med-name line of a printed label
        // (accounts for initials boxes taking ~8mm of the label width)
        const MED_NAME_MAX_CHARS = 38;
        
        if (fullMedLine.length > MED_NAME_MAX_CHARS) {
            return this.generateLabelsWithLongMedName(data, fullMedLine, MED_NAME_MAX_CHARS);
        }
        
        // Normal flow
        const splitInfo = this.needsMultipleLabels(data);
        
        if (splitInfo.needsSplitting) {
            return this.generateSplitLabels(data, splitInfo);
        }
        
        // Secondary safety check based on raw character count
        const totalContentLength = (data.dosageInstructions || '').length + (data.additionalInformation || '').length;
        if (totalContentLength > 280) {
            return this.generateSplitLabels(data, { needsSplitting: true });
        }
        
        return [this.generateSingleLabel(data)];
    },

    /**
     * Handle labels when the medication name is too long for a single line
     * Label 1: first portion of the med name
     * Label 2+: continuation of med name + dosage + warnings + patient info
     */
    generateLabelsWithLongMedName(data, fullMedLine, maxChars) {
        const dispensary = DataManager.getDispensaryInfo(data.dispensaryLocation);
        const date = data.dateOfDispensing ? new Date(data.dateOfDispensing).toLocaleDateString('en-GB') : '';
        const patientName = data.isOverlabelMode ? 
            '<span class="overlabel-placeholder">Patient Name: ________________</span>' : 
            data.patientName;
        
        // Split the medication line into chunks that each fit within maxChars
        const nameChunks = [];
        let remainder = fullMedLine;
        
        while (remainder.length > maxChars) {
            // Find the last '/', '-', or ' ' within the maxChars limit
            let splitIndex = -1;
            const searchEnd = Math.min(remainder.length - 1, maxChars - 1);
            for (let i = searchEnd; i > 0; i--) {
                const ch = remainder[i];
                if (ch === '/' || ch === '-' || ch === ' ') {
                    splitIndex = i;
                    break;
                }
            }
            
            // If no good split point found, break out and use what we have
            if (splitIndex <= 0) break;
            
            const splitChar = remainder[splitIndex];
            if (splitChar === ' ') {
                nameChunks.push(remainder.substring(0, splitIndex));
                remainder = remainder.substring(splitIndex + 1);
            } else {
                // '/' or '-': keep delimiter on this chunk
                nameChunks.push(remainder.substring(0, splitIndex + 1));
                remainder = remainder.substring(splitIndex + 1);
            }
        }
        
        // If we couldn't produce any chunks, fall back to normal flow
        if (nameChunks.length === 0) {
            const splitInfo = this.needsMultipleLabels(data);
            if (splitInfo.needsSplitting) {
                return this.generateSplitLabels(data, splitInfo);
            } else {
                return [this.generateSingleLabel(data)];
            }
        }
        
        // Generate content labels with the final remainder as the medication name
        const modifiedData = {
            ...data,
            medicationName: remainder.trim(),
            medicationStrength: '',
            medicationFormulation: '',
            medicationQuantity: ''
        };
        
        const splitInfo = this.needsMultipleLabels(modifiedData);
        let contentLabels;
        if (splitInfo.needsSplitting) {
            contentLabels = this.generateSplitLabels(modifiedData, splitInfo);
        } else {
            contentLabels = [this.generateSingleLabel(modifiedData)];
        }
        
        const totalLabels = nameChunks.length + contentLabels.length;
        
        // Create name-only labels for each chunk
        const allLabels = [];
        const showInitials = data.showInitials !== false;
        nameChunks.forEach((chunk, i) => {
            allLabels.push(this.createLabelHtml({
                medicationFull: chunk,
                medicationQuantity: '',
                mainContent: '',
                mainContentClass: 'content-wrapper',
                labelNumber: i + 1,
                totalLabels: totalLabels,
                patientName,
                date,
                dispensary,
                showInitials
            }));
        });
        
        // Fix label numbering in the content labels and append
        const nameLabelCount = nameChunks.length;
        contentLabels.forEach((labelHtml, i) => {
            let fixed = labelHtml;
            // Update existing "Label X of Y" numbering
            if (/Label \d+ of \d+/.test(fixed)) {
                fixed = fixed.replace(/Label \d+ of \d+/g, `Label ${nameLabelCount + i + 1} of ${totalLabels}`);
            } else {
                // Inject numbering for single-content labels that don't have it
                fixed = fixed.replace(
                    '<div class="pharmacy-details">',
                    `<div class="split-label-info"><span class="label-number">Label ${nameLabelCount + i + 1} of ${totalLabels}</span></div><div class="pharmacy-details">`
                );
            }
            allLabels.push(fixed);
        });
        
        return allLabels;
    },

    /**
     * Check if content needs to be split across multiple labels
     * @param {Object} data - Form data
     * @returns {Object} - Object with details about what needs splitting and how
     */
    needsMultipleLabels(data) {
        const dosageLength = (data.dosageInstructions || '').length;
        const warningLength = (data.additionalInformation ? data.additionalInformation.length : 0);
        
        // Estimate lines needed based on characters per line at each font size
        // Adaptive chars per line: if ≥50% letters are uppercase, bold text is wider
        const dosageText = data.dosageInstructions || '';
        const dosageLetters = dosageText.replace(/[^a-zA-Z]/g, '');
        const dosageUpperCount = (dosageText.match(/[A-Z]/g) || []).length;
        const DOSAGE_CHARS_PER_LINE = (dosageLetters.length > 0 && dosageUpperCount >= dosageLetters.length / 2) ? 33 : 35;
        const WARNING_CHARS_PER_LINE = 61; // ~61 chars per line at 5.5pt (empirically measured)
        const MAX_DOSAGE_LINES = 3;        // Maximum dosage lines before splitting
        
        const dosageLinesNeeded = dosageLength > 0 ? Math.ceil(dosageLength / DOSAGE_CHARS_PER_LINE) : 0;
        const warningLinesNeeded = warningLength > 0 ? Math.ceil(warningLength / WARNING_CHARS_PER_LINE) : 0;
        
        // Calculate whether everything fits on one label using warning-line equivalents
        // A dosage line at 8.5pt takes ~1.9x the vertical space of a warning line at 5.5pt
        const DOSAGE_TO_WARNING_RATIO = 1.9;
        const MAX_WARNING_LINE_EQUIVALENTS = 7; // Empirical: max is 2 dosage + 3 warnings = 6.8 equiv
        
        const totalWarningEquivalent = (dosageLinesNeeded * DOSAGE_TO_WARNING_RATIO) + warningLinesNeeded;
        
        // Content fits on a single label if dosage doesn't exceed max lines
        // and total content fits within the label's capacity
        if (dosageLinesNeeded <= MAX_DOSAGE_LINES && totalWarningEquivalent <= MAX_WARNING_LINE_EQUIVALENTS) {
            return {
                needsSplitting: false
            };
        }
        
        // Content needs splitting
        return {
            needsSplitting: true,
            splitDosage: dosageLinesNeeded > MAX_DOSAGE_LINES,
            splitWarnings: warningLinesNeeded > 6
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
        
        // Handle overlabel mode - use placeholder text instead of actual patient name
        const patientName = data.isOverlabelMode ? 
            '<span class="overlabel-placeholder">Patient Name: ________________</span>' : 
            data.patientName;
        
        const showInitials = data.showInitials !== false;
        
        // Format medication name, strength and formulation (title-cased for display)
        const medicationName = this.toTitleCase(data.medicationName || '');
        const medicationStrength = data.medicationStrength ? `${data.medicationStrength} ` : '';
        const medicationFormulation = this.toTitleCase(data.medicationFormulation || '');
        const medicationFull = `${medicationName} ${medicationStrength}${medicationFormulation}`;
        
        // Get warning text from additional information field (already includes standard warning if enabled)
        let warningText = data.additionalInformation || '';
        
        // Define constants for label generation
        const MAX_LINES_PER_LABEL = 3; // Number of lines per label for dosage
        const LINE_LENGTH = 35; // Default line length for pharmacy labels (dosage)
        const LINE_LENGTH_UPPER = 33; // Shorter limit when ≥50% of letters are uppercase
        
        // Adaptive line length: if ≥50% of letters on the line are uppercase, use shorter limit
        const getEffectiveLineLength = (text) => {
            const letters = text.replace(/[^a-zA-Z]/g, '');
            if (letters.length === 0) return LINE_LENGTH;
            const upperCount = (text.match(/[A-Z]/g) || []).length;
            return upperCount >= letters.length / 2 ? LINE_LENGTH_UPPER : LINE_LENGTH;
        };
        
        // Process dosage instructions
        const dosageContent = data.dosageInstructions || '';
        
        // Create arrays to hold processed content
        const dosageLabels = [];
        const warningLabels = [];
        
        // Process dosage instructions
        if (dosageContent) {
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
            
            // Hard-wrap text to create discrete lines of approximately equal length
            const dosageLines = [];
            
            // Process each sentence and create visual lines
            for (const sentence of processedSentences) {
                if (sentence.trim() === '') continue; // Skip empty sentences
                
                // For very short sentences, use them as-is
                if (sentence.length <= getEffectiveLineLength(sentence)) {
                    dosageLines.push(sentence);
                    continue;
                }
                
                // For longer sentences, break them into visual lines
                const words = sentence.split(/\s+/);
                let currentLine = '';
                
                for (const word of words) {
                    const testLine = currentLine ? currentLine + ' ' + word : word;
                    const effectiveLength = getEffectiveLineLength(testLine);
                    
                    // If this word would make the line too long, start a new line
                    // Exception: if this is the first word on the line, keep it regardless of length
                    if (currentLine && testLine.length > effectiveLength) {
                        dosageLines.push(currentLine); // Add completed line
                        currentLine = word; // Start new line with this word
                    } else {
                        // Add word to current line with appropriate spacing
                        currentLine = testLine;
                    }
                }
                
                // Add the final line if there's anything left
                if (currentLine) {
                    dosageLines.push(currentLine);
                }
            }
            
            // Group dosage lines into labels (approximately MAX_LINES_PER_LABEL per label)
            for (let i = 0; i < dosageLines.length; i += MAX_LINES_PER_LABEL) {
                const labelLines = dosageLines.slice(i, i + MAX_LINES_PER_LABEL);
                if (labelLines.length > 0) {
                    // Store the raw lines and their count for potential optimization later
                    dosageLabels.push({
                        content: labelLines.join(' '),
                        lineCount: labelLines.length
                    });
                }
            }
            
            // Character budget per visual warning line (empirically tuned)
            const CHARS_PER_WARNING_LINE = 58; // empirically measured warning chars per line
            
            // Empirically tested: how many warning lines fit alongside N dosage lines
            const calculateAvailableWarningLines = (dosageLineCount) => {
                if (dosageLineCount <= 1) return 5;
                if (dosageLineCount === 2) return 3;
                if (dosageLineCount === 3) return 1;
                return 0; // 4+ dosage lines: no room for warnings
            };
            
            // Maximum warning lines on a standalone warning label (no dosage)
            const STANDALONE_WARNING_CAPACITY = 8;
            
            // Find the best split point in text near the target character position.
            // Prefers splitting at a full stop (sentence boundary); falls back to word boundary.
            const findSplitPoint = (text, targetPos) => {
                if (targetPos >= text.length) return text.length;
                
                // Look for the last full stop followed by a space within the budget
                const searchStart = Math.floor(targetPos * 0.60); // search back up to 40%
                const searchRegion = text.substring(searchStart, targetPos);
                const lastPeriodSpace = searchRegion.lastIndexOf('. ');
                
                if (lastPeriodSpace !== -1) {
                    // Split after the full stop and space
                    return searchStart + lastPeriodSpace + 2;
                }
                
                // No sentence boundary found; fall back to last word boundary
                const lastSpace = text.lastIndexOf(' ', targetPos);
                if (lastSpace > 0) return lastSpace + 1;
                
                return targetPos;
            };
            
            // Distribute warning text across labels using character budgets
            let remainingWarnings = warningText ? warningText.trim() : '';
            
            // For each dosage label, calculate how much warning text it can take
            const warningTextPerDosageLabel = dosageLabels.map((dl, idx) => {
                let available = calculateAvailableWarningLines(dl.lineCount);
                
                // When multiple dosage labels exist, labels at max capacity (3 lines)
                // get no warnings — packed lines with bold uppercase text may word-wrap
                // to extra visual lines, leaving no room for warnings
                if (dosageLabels.length > 1 && dl.lineCount >= 3) {
                    available = 0;
                }
                
                if (available === 0 || !remainingWarnings) return '';
                
                const charBudget = available * CHARS_PER_WARNING_LINE;
                const splitPos = findSplitPoint(remainingWarnings, charBudget);
                const taken = remainingWarnings.substring(0, splitPos).trim();
                remainingWarnings = remainingWarnings.substring(splitPos).trim();
                return taken;
            });
            
            // Remaining warnings go into standalone labels (also split at sentence boundaries)
            const standaloneWarningTexts = [];
            while (remainingWarnings.length > 0) {
                const charBudget = STANDALONE_WARNING_CAPACITY * CHARS_PER_WARNING_LINE;
                const splitPos = findSplitPoint(remainingWarnings, charBudget);
                standaloneWarningTexts.push(remainingWarnings.substring(0, splitPos).trim());
                remainingWarnings = remainingWarnings.substring(splitPos).trim();
            }
            
            const totalLabels = dosageLabels.length + standaloneWarningTexts.length;
            
            // Generate dosage labels (with combined warnings where they fit)
            for (let i = 0; i < dosageLabels.length; i++) {
                const dosageLabel = dosageLabels[i];
                const labelWarnings = warningTextPerDosageLabel[i];
                let mainContent;
                
                if (labelWarnings) {
                    mainContent = `
                        <div class="dosage-instructions">${dosageLabel.content}</div>
                        <div class="additional-info">${labelWarnings}</div>
                    `;
                } else {
                    mainContent = `<div class="dosage-instructions">${dosageLabel.content}</div>`;
                }
                
                labels.push(this.createLabelHtml({
                    medicationFull,
                    medicationQuantity: data.medicationQuantity,
                    mainContent: mainContent,
                    mainContentClass: 'content-wrapper',
                    labelNumber: i + 1,
                    totalLabels: totalLabels,
                    patientName: patientName,
                    date,
                    dispensary,
                    showInitials
                }));
            }
            
            // Generate standalone warning labels for remaining text
            for (let i = 0; i < standaloneWarningTexts.length; i++) {
                labels.push(this.createLabelHtml({
                    medicationFull,
                    medicationQuantity: data.medicationQuantity,
                    mainContent: `<div class="additional-info">${standaloneWarningTexts[i]}</div>`,
                    mainContentClass: 'content-wrapper',
                    labelNumber: dosageLabels.length + i + 1,
                    totalLabels: totalLabels,
                    patientName: patientName,
                    date,
                    dispensary,
                    showInitials
                }));
            }
            
            return labels;
        } 
        // If there was no dosage content, but we have warnings, create a label just for warnings
        else if (warningText) {
            // Process the warning text for a single label
            const WARNING_LINE_LENGTH = 58; // empirically measured warning chars per line
            const normalizedWarning = warningText.replace(/\r\n|\r/g, '\n');
            const warningLines = [];
            const warningWords = normalizedWarning.split(/\s+/);
            
            let currentLine = '';
            for (const word of warningWords) {
                if (currentLine && (currentLine + ' ' + word).length > WARNING_LINE_LENGTH) {
                    warningLines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = currentLine ? currentLine + ' ' + word : word;
                }
            }
            
            if (currentLine) {
                warningLines.push(currentLine);
            }
            
            // Create a single label with just warnings
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: `<div class="additional-info">${warningLines.join(' ')}</div>`,
                mainContentClass: 'content-wrapper',
                labelNumber: 1,
                totalLabels: 1,
                patientName: patientName,
                date,
                dispensary,
                showInitials
            }));
            
            return labels;
        }
        
        // If we got here with no content at all, return a simple label with just medication info
        if (labels.length === 0) {
            labels.push(this.createLabelHtml({
                medicationFull,
                medicationQuantity: data.medicationQuantity,
                mainContent: '',
                mainContentClass: 'content-wrapper',
                labelNumber: 1,
                totalLabels: 1,
                patientName: patientName,
                date,
                dispensary,
                showInitials
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
            dispensary,
            showInitials = true
        } = options;
        
        return `
            <div class="label-content">
                ${showInitials ? `<!-- Initial boxes for dispenser and checker -->
                <div class="initials-boxes">
                    <div class="initials-box"></div>
                    <div class="initials-box"></div>
                </div>` : ''}
                
                <!-- Top Section: Medication info and main content -->
                <div class="label-top-section">
                    <!-- Row 1: Quantity, Medication Name, Strength, Formulation (ensure single line) -->
                    <div class="medication">
                        <div class="med-name single-line">${medicationQuantity ? `${medicationQuantity} ` : ''}${medicationFull}</div>
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
                    
                    <!-- Label Number at Bottom (only shown when content spans multiple labels) -->
                    ${totalLabels > 1 ? `<div class="split-label-info">
                        <span class="label-number">Label ${labelNumber} of ${totalLabels}</span>
                    </div>` : ''}
                    
                    <!-- Bottom Row: Pharmacy Details -->
                    <div class="pharmacy-details">
                        ${dispensary.name}, ${dispensary.address}, Tel: ${dispensary.phone}
                    </div>
                </div>
            </div>
        `;
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
                    <div class="bag-label-patient-name">${data.isOverlabelMode ? 
                        '<span class="overlabel-placeholder">Patient Name: ________________</span>' : 
                        (data.patientName || '')}</div>
                    <div class="bag-label-patient-details">
                        <div>DOB: ${dob}</div>
                        ${data.patientNHS ? `<div>NHS: ${data.patientNHS}</div>` : ''}
                    </div>
                    <div class="bag-label-patient-address">${(data.patientAddress || '').split(/\r?\n/)[0]}</div>
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
        
        // Format medication name, strength and formulation (title-cased for display)
        const medicationName = this.toTitleCase(data.medicationName || '');
        const medicationStrength = data.medicationStrength ? `${data.medicationStrength} ` : '';
        const medicationFormulation = this.toTitleCase(data.medicationFormulation || '');
        const medicationFull = `${medicationName} ${medicationStrength}${medicationFormulation}`;
        
        // Generate HTML for the label
        const showInitials = data.showInitials !== false;
        return `
        <div class="label-content">
            ${showInitials ? `<!-- Initial boxes for dispenser and checker -->
            <div class="initials-boxes">
                <div class="initials-box"></div>
                <div class="initials-box"></div>
            </div>` : ''}
            
            <!-- Top Section: Medication info and main content -->
            <div class="label-top-section">
                <!-- Row 1: Quantity, Medication Name, Strength, Formulation (ensure single line) -->
                <div class="medication">
                    <div class="med-name single-line">${data.medicationQuantity ? `${data.medicationQuantity} ` : ''}${medicationFull}</div>
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
                    ${data.isOverlabelMode ? 
                        `<span class="patient-name placeholder">Patient Name: ________________</span>` : 
                        `<span class="patient-name">${data.patientName || ''}</span>`
                    }
                    <span class="dispensing-date">${date}</span>
                </div>
                
                <!-- Bottom Row: Pharmacy Details -->
                <div class="pharmacy-details">
                    ${dispensary.name}, ${dispensary.address}, Tel: ${dispensary.phone}
                </div>
            </div>
        </div>
        `;
    }
};
