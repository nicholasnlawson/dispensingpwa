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
        '3p': 'Inhale THREE puffs',
        '4p': 'Inhale FOUR puffs',
        '5p': 'Inhale FIVE puffs',
        '6p': 'Inhale SIX puffs', 
        '7p': 'Inhale SEVEN puffs',
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
        '1u': 'Inject ONE unit',
        '2u': 'Inject TWO units',
        '5u': 'Inject FIVE units',
        '10u': 'Inject TEN units',
        
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
        'wk': 'WEEKLY',
        '2wk': 'every TWO weeks',
        '4wk': 'every FOUR weeks',
        'mth': 'MONTHLY',
        
        // Daily timing specifications
        'am': 'in the MORNING',
        'od08': 'at 8am',
        'od12': 'at 12pm',
        'od16': 'at 4pm',
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
        'ec': 'enteric coated',
        'sr': 'slow release',
        'mr': 'modified release',
        'pr': 'prolonged release',
        'disp': 'dispersible',
        'sol': 'soluble',
        'ndc': 'not to be crushed',
        
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
        'shake': 'Shake well before use',
        'rinse': 'Rinse mouth after use',
        'nswallow': 'Do not swallow',
        'dissolve': 'Allow to dissolve under the tongue',
        'crush': 'Tablet may be crushed',
        'whole': 'Swallow whole, do not chew or crush',
        'protect': 'Protect from light',
        'fridge': 'Store in a refrigerator',
        'discard': 'Discard 28 days after opening'
    },
    
    /**
     * Get the full text for a shorthand code
     * @param {string} code - The shorthand code
     * @returns {string|null} - The full text or null if not found
     */
    getFullText(code) {
        if (!code) return null;
        
        // Normalize the code (trim whitespace, lowercase)
        const normalizedCode = code.trim();
        
        return this.mappings[normalizedCode] || null;
    }
};
