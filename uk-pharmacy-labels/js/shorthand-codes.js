/**
 * Downtime Pharmacy Label Generator
 * Shorthand Codes Module
 * 
 * This file contains all the shorthand codes used in the application.
 * These codes are used to translate shorthand notation into full dosage instructions.
 */

const ShorthandCodes = window.ShorthandCodes = {
    /**
     * Mapping of shorthand codes to their full text equivalents
     */
    mappings: {
        // Dosage quantities - Tablets (common examples, pattern matching handles all others)
        '1t': 'Take ONE tablet',
        '2t': 'Take TWO tablets',
        '3t': 'Take THREE tablets',
        '4t': 'Take FOUR tablets',
        '0.5t': 'Take HALF a tablet',
        '1.5t': 'Take ONE AND A HALF tablets',
        '2.5t': 'Take TWO AND A HALF tablets',
        
        // Dosage quantities - Capsules (common examples, pattern matching handles all others)
        '1c': 'Take ONE capsule',
        '2c': 'Take TWO capsules',
        
        // Dosage quantities - Liquid preparations (fixed values that don't follow a pattern)
        '5ml': 'Take 5ml',
        '10ml': 'Take 10ml',
        '15ml': 'Take 15ml',
        '20ml': 'Take 20ml',

        // Dosage quantities - Inhalers (common examples, pattern matching handles all others)
        '1p': 'Inhale ONE puff',
        '2p': 'Inhale TWO puffs',
        
        // Dosage quantities - Drops (common examples, pattern matching handles all others)
        '1d': 'Apply ONE drop',
        '2d': 'Apply TWO drops',
                
        // Dosage quantities - Injections
        
        // Frequencies
        'od': 'ONCE a day',
        'om': 'on a morning',
        'on': 'at night',
        'bd': 'TWICE a day',
        'tds': 'THREE times a day',
        'qds': 'FOUR times a day',
        'prn': 'when required',
        'stat': 'IMMEDIATELY',
        'mane': 'in the MORNING',
        'nocte': 'at NIGHT',
        'altd': 'on ALTERNATE days',
        'altm': 'on ALTERNATE mornings',
        'alte': 'on ALTERNATE evenings',
        'altn': 'on ALTERNATE nights',
        '1w': 'WEEKLY',
        '2w': 'every TWO weeks',
        '4w': 'every FOUR weeks',
        '1m': 'MONTHLY',
        '2m': 'every TWO months',
        '3m': 'every THREE months',
        '6m': 'every SIX months',
        '1y': 'YEARLY',
        
        // Daily timing specifications
        'am': 'in the MORNING',
        'od07': 'ONCE a day at 7am',
        'od08': 'ONCE a day at 8am',
        'od12': 'ONCE a day at 12pm',
        'od16': 'ONCE a day at 4pm',
        'od20': 'ONCE a day at 8pm',
        'od22': 'ONCE a day at 10pm',
        'pm': 'in the EVENING',
        'dinnertime': 'at DINNER time',
        'lunchtime': 'at LUNCH time',
        'breakfast': 'with BREAKFAST',
        'dinner': 'with DINNER',
        'bm': 'BEFORE meals',
        'am': 'AFTER meals',
        'wm': 'WITH meals',
        
        // Routes
        'po': 'by mouth',
        'sl': 'under the tongue',
        'buc': 'placed between the gum and cheek',
        'pr': 'rectally',
        'pv': 'vaginally',
        'sc': 'subcutaneously',
        'im': 'intramuscularly',
        'iv': 'intravenously',
        'inh': 'by inhalation',
        'neb': 'via nebuliser',
        'top': 'applied topically',
        'td': 'applied to the skin',
        'oc': 'into the eye(s)',
        'au': 'into the ear(s)',
        'nas': 'into the nose',
        
        // Eye/Ear drop specifications
        'le': 'into the LEFT eye',
        're': 'into the RIGHT eye',
        'be': 'into BOTH eyes',
        'la': 'into the LEFT ear',
        'ra': 'into the RIGHT ear',
        'ba': 'into BOTH ears',
        
        // Instructions and special phrases
        'wf': 'with food',
        'bf': 'before food',
        'af': 'after food',
        'disp': 'disperse in water',
        'dnc': 'not to be crushed',
        'shake': 'shake well before use',
        'rinse': 'rinse mouth after use',
        'nswallow': 'do not swallow',
        'c+d': 'tablet may be crushed and dispersed in water',
        'crush': 'tablet may be crushed',
        'open': 'capsule may be opened and the contents dispersed in water',
        'whole': 'swallow whole, do not chew or crush',
        'protect': 'protect from light',
        'fridge': 'store in a refrigerator',
        'discard': 'discard after 28 days of opening',
        'utd': 'as directed',
        'mdu': 'as directed',
        'asd': 'as directed',
        
        // Duration specifications (explicitly defined for common values)
        '1/7': 'for ONE day',
        '2/7': 'for TWO days',
        '3/7': 'for THREE days',
        '4/7': 'for FOUR days',
        '5/7': 'for FIVE days',
        '6/7': 'for SIX days',
        '7/7': 'for SEVEN days',
        '8/7': 'for EIGHT days',
        '9/7': 'for NINE days',
        '10/7': 'for TEN days',
        '11/7': 'for ELEVEN days',
        '12/7': 'for TWELVE days',
        '13/7': 'for THIRTEEN days',
        '14/7': 'for FOURTEEN days',
        
        // Weeks and months examples (explicit mappings)
        '1/52': 'for ONE week',
        '2/52': 'for TWO weeks',
        '4/52': 'for FOUR weeks',
        '1/12': 'for ONE month',
        '2/12': 'for TWO months',
        '3/12': 'for THREE months',
        '6/12': 'for SIX months'
    },
    
    /**
     * Case-insensitive mappings cache
     * This will be populated during initialization
     */
    lowercaseMappings: {},
    
    /**
     * Initialize the case-insensitive mappings
     */
    init() {
        // Convert all mapping keys to lowercase for case-insensitive matching
        for (const [key, value] of Object.entries(this.mappings)) {
            this.lowercaseMappings[key.toLowerCase()] = value;
        }
    },
    
    /**
     * Get the full text for a shorthand code
     * @param {string} code - The shorthand code
     * @returns {string|null} - The full text or null if not found
     */
    getFullText(code) {
        if (!code) return null;
        
        // Normalize the code (trim whitespace, convert to lowercase for case-insensitivity)
        const normalizedCode = code.trim().toLowerCase();
        
        // Check for exact matches in the mappings
        if (this.lowercaseMappings[normalizedCode]) {
            return this.lowercaseMappings[normalizedCode];
        }
        
        // Pattern matching for dosage quantities
        
        // Tablet range pattern: number-number followed by 't'
        const tabletRangePattern = /^([0-9]+\.?[0-9]*)-([0-9]+\.?[0-9]*)t$/;
        const tabletRangeMatch = normalizedCode.match(tabletRangePattern);
        if (tabletRangeMatch) {
            const minQuantity = parseFloat(tabletRangeMatch[1]);
            const maxQuantity = parseFloat(tabletRangeMatch[2]);
            return this.formatDosageRange(minQuantity, maxQuantity, 'tablet', 'Take');
        }
        
        // Capsule range pattern: number-number followed by 'c'
        const capsuleRangePattern = /^([0-9]+\.?[0-9]*)-([0-9]+\.?[0-9]*)c$/;
        const capsuleRangeMatch = normalizedCode.match(capsuleRangePattern);
        if (capsuleRangeMatch) {
            const minQuantity = parseFloat(capsuleRangeMatch[1]);
            const maxQuantity = parseFloat(capsuleRangeMatch[2]);
            return this.formatDosageRange(minQuantity, maxQuantity, 'capsule', 'Take');
        }
        
        // Puff range pattern: number-number followed by 'p'
        const puffRangePattern = /^([0-9]+\.?[0-9]*)-([0-9]+\.?[0-9]*)p$/;
        const puffRangeMatch = normalizedCode.match(puffRangePattern);
        if (puffRangeMatch) {
            const minQuantity = parseFloat(puffRangeMatch[1]);
            const maxQuantity = parseFloat(puffRangeMatch[2]);
            return this.formatDosageRange(minQuantity, maxQuantity, 'puff', 'Inhale');
        }
        
        // Drop range pattern: number-number followed by 'd'
        const dropRangePattern = /^([0-9]+\.?[0-9]*)-([0-9]+\.?[0-9]*)d$/;
        const dropRangeMatch = normalizedCode.match(dropRangePattern);
        if (dropRangeMatch) {
            const minQuantity = parseFloat(dropRangeMatch[1]);
            const maxQuantity = parseFloat(dropRangeMatch[2]);
            return this.formatDosageRange(minQuantity, maxQuantity, 'drop', 'Apply');
        }
        
        // ML range pattern: number-number followed by 'ml'
        const mlRangePattern = /^([0-9]+\.?[0-9]*)-([0-9]+\.?[0-9]*)ml$/;
        const mlRangeMatch = normalizedCode.match(mlRangePattern);
        if (mlRangeMatch) {
            const minQuantity = parseFloat(mlRangeMatch[1]);
            const maxQuantity = parseFloat(mlRangeMatch[2]);
            return `Take ${minQuantity}-${maxQuantity}ml`;
        }
        
        // Tablets pattern: number followed by 't'
        const tabletPattern = /^([0-9]+\.?[0-9]*)t$/;
        const tabletMatch = normalizedCode.match(tabletPattern);
        if (tabletMatch) {
            const quantity = parseFloat(tabletMatch[1]);
            return this.formatDosageQuantity(quantity, 'tablet', 'Take');
        }
        
        // Capsules pattern: number followed by 'c'
        const capsulePattern = /^([0-9]+\.?[0-9]*)c$/;
        const capsuleMatch = normalizedCode.match(capsulePattern);
        if (capsuleMatch) {
            const quantity = parseFloat(capsuleMatch[1]);
            return this.formatDosageQuantity(quantity, 'capsule', 'Take');
        }
        
        // Puffs pattern: number followed by 'p'
        const puffPattern = /^([0-9]+\.?[0-9]*)p$/;
        const puffMatch = normalizedCode.match(puffPattern);
        if (puffMatch) {
            const quantity = parseFloat(puffMatch[1]);
            return this.formatDosageQuantity(quantity, 'puff', 'Inhale');
        }
        
        // Drops pattern: number followed by 'd'
        const dropPattern = /^([0-9]+\.?[0-9]*)d$/;
        const dropMatch = normalizedCode.match(dropPattern);
        if (dropMatch) {
            const quantity = parseFloat(dropMatch[1]);
            return this.formatDosageQuantity(quantity, 'drop', 'Apply');
        }
        
        // ML pattern: number followed by 'ml'
        const mlPattern = /^([0-9]+\.?[0-9]*)ml$/;
        const mlMatch = normalizedCode.match(mlPattern);
        if (mlMatch) {
            const quantity = parseFloat(mlMatch[1]);
            return `Take ${quantity}ml`;
        }
        
        // Check for duration patterns
        const dayPattern = /^(\d+)\/7$/;   // For days (e.g., 15/7 for 15 days)
        const weekPattern = /^(\d+)\/52$/; // For weeks (e.g., 3/52 for 3 weeks)
        const monthPattern = /^(\d+)\/12$/; // For months (e.g., 4/12 for 4 months)
        
        // Parse day pattern
        const dayMatch = normalizedCode.match(dayPattern);
        if (dayMatch) {
            const days = parseInt(dayMatch[1], 10);
            return `for ${this.numberToWords(days)} ${days === 1 ? 'day' : 'days'}`;
        }
        
        // Parse week pattern
        const weekMatch = normalizedCode.match(weekPattern);
        if (weekMatch) {
            const weeks = parseInt(weekMatch[1], 10);
            return `for ${this.numberToWords(weeks)} ${weeks === 1 ? 'week' : 'weeks'}`;
        }
        
        // Parse month pattern
        const monthMatch = normalizedCode.match(monthPattern);
        if (monthMatch) {
            const months = parseInt(monthMatch[1], 10);
            return `for ${this.numberToWords(months)} ${months === 1 ? 'month' : 'months'}`;
        }
        
        return null;
    },
    
    /**
     * Format a dosage range with the appropriate wording
     * @param {number} minQuantity - The minimum quantity
     * @param {number} maxQuantity - The maximum quantity
     * @param {string} unit - The unit (tablet, capsule, puff, drop, etc.)
     * @param {string} verb - The verb to use (Take, Apply, Inhale, etc.)
     * @returns {string} - Formatted dosage range instruction
     */
    formatDosageRange(minQuantity, maxQuantity, unit, verb) {
        // Convert quantities to words
        const minText = this.numberToWords(minQuantity);
        const maxText = this.numberToWords(maxQuantity);
        
        // Always pluralize the unit when it's a range
        const unitPlural = `${unit}s`;
        
        return `${verb} ${minText} to ${maxText} ${unitPlural}`;
    },
    
    /**
     * Format a dosage quantity with the appropriate wording
     * @param {number} quantity - The quantity (can be integer or decimal)
     * @param {string} unit - The unit (tablet, capsule, puff, drop, etc.)
     * @param {string} verb - The verb to use (Take, Apply, Inhale, etc.)
     * @returns {string} - Formatted dosage instruction
     */
    formatDosageQuantity(quantity, unit, verb) {
        // Handle special case for 0.5
        if (quantity === 0.5) {
            return `${verb} HALF a ${unit}`;
        }
        
        // Handle whole numbers
        if (Number.isInteger(quantity)) {
            const quantityText = this.numberToWords(quantity);
            const unitPlural = quantity === 1 ? unit : `${unit}s`;
            return `${verb} ${quantityText} ${unitPlural}`;
        }
        
        // Handle half quantities (e.g., 1.5, 2.5, etc.)
        if (quantity % 1 === 0.5) {
            const wholeNumber = Math.floor(quantity);
            const wholeText = this.numberToWords(wholeNumber);
            return `${verb} ${wholeText} AND A HALF ${unit}s`;
        }
        
        // Handle other decimal quantities
        return `${verb} ${quantity} ${unit}s`;
    },
    
    /**
     * Convert a number to words (for numbers 1-20)
     * @param {number} num - The number to convert
     * @returns {string} - The number in words, uppercase for emphasis
     */
    numberToWords(num) {
        const words = [
            'ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
            'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN', 'TWENTY'
        ];
        
        if (num >= 0 && num <= 20) {
            return words[num];
        } else {
            // For numbers above 20, return the actual number
            return num.toString();
        }
    }
};

// Initialize the ShorthandCodes on load
ShorthandCodes.init();
