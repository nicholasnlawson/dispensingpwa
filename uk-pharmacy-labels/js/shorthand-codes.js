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
        // Dosage quantities - Tablets
        '1t': 'Take ONE tablet',
        '2t': 'Take TWO tablets',
        '3t': 'Take THREE tablets',
        '4t': 'Take FOUR tablets',
        '5t': 'Take FIVE tablets',
        '6t': 'Take SIX tablets',
        '0.5t': 'Take HALF a tablet',
        '1.5t': 'Take ONE AND A HALF tablets',
        '2.5t': 'Take TWO AND A HALF tablets',
        '3.5t': 'Take THREE AND A HALF tablets',
        '4.5t': 'Take FOUR AND A HALF tablets',
        '5.5t': 'Take FIVE AND A HALF tablets',
        '6.5t': 'Take SIX AND A HALF tablets',
    
        
        // Dosage quantities - Capsules
        '1c': 'Take ONE capsule',
        '2c': 'Take TWO capsules',
        '3c': 'Take THREE capsules',
        '4c': 'Take FOUR capsules',
        
        // Dosage quantities - Liquid preparations
        '5ml': 'Take 5ml',
        '10ml': 'Take 10ml',
        '15ml': 'Take 15ml',
        '20ml': 'Take 20ml',

        // Dosage quantities - Inhalers
        '1p': 'Inhale ONE puff',
        '2p': 'Inhale TWO puffs',
        '8p': 'Inhale EIGHT puffs',
        '9p': 'Inhale NINE puffs',
        '10p': 'Inhale TEN puffs',
        
        // Dosage quantities - Drops
        '1d': 'Apply ONE drop',
        '2d': 'Apply TWO drops',
        '3d': 'Apply THREE drops',
        '4d': 'Apply FOUR drops',
        '5d': 'Apply FIVE drops',
        '6d': 'Apply SIX drops',
                
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
        
        // Common phrases
        'wf': 'with food',
        'bf': 'before food',
        'af': 'after food',
        'disp': 'disperse in water',
        'dnc': 'not to be crushed',
        
        // Duration specifications
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
        
        // Special instructions
        'shake': '. Shake well before use',
        'rinse': '. Rinse mouth after use',
        'nswallow': '. Do not swallow',

        'c+d': '. Tablet may be crushed and dispersed in water',
        'crush': '. Tablet may be crushed',
        'open': '. Capsule may be opened and the contents dispersed in water',
        'whole': '. Swallow whole, do not chew or crush',
        'protect': '. Protect from light',
        'fridge': '. Store in a refrigerator',
        'discard': '. Discard 28 days after opening'
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
        
        return this.lowercaseMappings[normalizedCode] || null;
    }
};

// Initialize the ShorthandCodes on load
ShorthandCodes.init();
