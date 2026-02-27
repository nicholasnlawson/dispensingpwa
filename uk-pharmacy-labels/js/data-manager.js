/**
 * UK Pharmacy Back-Up Label Generator
 * Data Manager Module
 * Provides dispensary location data for label generation
 * 
 * Note: This application intentionally does NOT store any patient data,
 * prescription history, or personally identifiable information.
 * All label data exists only in memory during the session.
 */

const DataManager = {
    /**
     * Get dispensary information based on selected location
     * @param {string} locationId - The selected location ID
     * @returns {Object} Dispensary information
     */
    getDispensaryInfo(locationId) {
        const locations = {
            'south-tyneside': {
                name: 'South Tyneside District Hospital',
                address: 'Harton Lane, South Shields',
                postcode: 'NE34 0PL',
                phone: '0191 4041058'
            },
            'sunderland-royal': {
                name: 'Sunderland Royal Hospital',
                address: 'Kayll Road, Sunderland',
                postcode: 'SR4 7TP',
                phone: '0191 5656256'
            },
            'sunderland-eye': {
                name: 'Sunderland Eye Infirmary',
                address: 'Queen Alexandra Road, Sunderland',
                postcode: 'SR2 9HP',
                phone: '0191 5656256'
            }
        };
        
        return locations[locationId] || locations['south-tyneside'];
    }
};
