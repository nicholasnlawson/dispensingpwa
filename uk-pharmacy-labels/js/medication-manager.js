/**
 * UK Pharmacy Back-Up Label Generator
 * Medication Manager Module
 * Handles medication autocomplete and warning labels
 */

const MedicationManager = {
    // Data storage
    medications: [],
    formulations: {},
    warningLabels: [],
    medicationWarnings: [],
    
    /**
     * Initialize the medication manager
     * Loads data from JSON files
     */
    async init() {
        try {
            // Load medication data
            let medications, formulations, warnings, medicationWarnings;
            
            try {
                // Try to load from data directory
                [medications, formulations, warnings, medicationWarnings] = await Promise.all([
                    this.fetchJSON('data/drug_aliases.json'),
                    this.fetchJSON('data/formulation_aliases.json'),
                    this.fetchJSON('data/bnf_labels.json'),
                    this.fetchJSON('data/drug_formulations_warnings.json')
                ]);
            } catch (e) {
                console.warn('Error loading from data directory, trying root directory:', e);
                
                // Try with root directory paths
                [medications, formulations, warnings, medicationWarnings] = await Promise.all([
                    this.fetchJSON('../drug_aliases.json'),
                    this.fetchJSON('../formulation_aliases.json'),
                    this.fetchJSON('../bnf_labels.json'),
                    this.fetchJSON('../drug_formulations_warnings.json')
                ]);
            }
            
            this.medications = medications || [];
            this.formulations = formulations || {};
            this.warningLabels = warnings?.cautionary_advisory_labels || [];
            this.medicationWarnings = medicationWarnings || [];
            
            console.log('Loaded medications:', this.medications.length);
            console.log('Loaded warning labels:', this.warningLabels.length);
            console.log('Loaded medication warnings:', this.medicationWarnings.length);
            
            // Initialize autocomplete
            this.initAutocomplete();
            
            console.log('Medication data loaded successfully');
        } catch (error) {
            console.error('Error loading medication data:', error);
            // Still initialize autocomplete with empty data
            this.initAutocomplete();
        }
    },
    
    /**
     * Fetch JSON data from a file
     * @param {string} url - URL of the JSON file
     * @returns {Promise<Object>} - Parsed JSON data
     */
    async fetchJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.statusText}`);
        }
        return response.json();
    },
    
    /**
     * Initialize autocomplete for medication and formulation inputs
     */
    initAutocomplete() {
        // Setup medication autocomplete
        const medicationInput = document.getElementById('med-name');
        if (medicationInput) {
            this.setupAutocomplete(medicationInput, this.getMedicationSuggestions.bind(this));
            medicationInput.addEventListener('change', this.updateWarningLabels.bind(this));
        }
        
        // Setup formulation autocomplete
        const formulationSelect = document.getElementById('med-form');
        if (formulationSelect) {
            // Replace select with input for autocomplete
            const formulationInput = document.createElement('input');
            formulationInput.type = 'text';
            formulationInput.id = 'med-form';
            formulationInput.placeholder = 'e.g., tablets, capsules, solution';
            formulationSelect.parentNode.replaceChild(formulationInput, formulationSelect);
            
            // Setup autocomplete
            this.setupAutocomplete(formulationInput, this.getFormulationSuggestions.bind(this));
            
            // Add event listeners for formulation changes
            formulationInput.addEventListener('change', () => {
                // Clear warnings and find new ones for the updated formulation
                this.updateWarningLabels();
            });
            
            // Also listen for input events to handle autocomplete selection
            formulationInput.addEventListener('input', () => {
                // Debounce to avoid too frequent updates
                clearTimeout(formulationInput._debounceTimer);
                formulationInput._debounceTimer = setTimeout(() => {
                    this.updateWarningLabels();
                }, 300);
            });
        }
    },
    
    /**
     * Setup autocomplete for an input element
     * @param {HTMLInputElement} inputElement - Input element to add autocomplete to
     * @param {Function} getSuggestions - Function to get suggestions based on input
     */
    setupAutocomplete(inputElement, getSuggestions) {
        // Create autocomplete container
        const autocompleteContainer = document.createElement('div');
        autocompleteContainer.className = 'autocomplete-container';
        
        // Create wrapper for positioning
        const wrapper = document.createElement('div');
        wrapper.className = 'autocomplete-wrapper';
        
        // Replace input with wrapper
        inputElement.parentNode.insertBefore(wrapper, inputElement);
        wrapper.appendChild(inputElement);
        wrapper.appendChild(autocompleteContainer);
        
        // Handle input events
        inputElement.addEventListener('input', () => {
            const value = inputElement.value.trim();
            if (value.length < 2) {
                autocompleteContainer.innerHTML = '';
                return;
            }
            
            const suggestions = getSuggestions(value);
            this.renderSuggestions(suggestions, autocompleteContainer, inputElement);
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (event) => {
            if (!inputElement.contains(event.target) && !autocompleteContainer.contains(event.target)) {
                autocompleteContainer.innerHTML = '';
            }
        });
        
        // Handle input focus
        inputElement.addEventListener('focus', () => {
            const value = inputElement.value.trim();
            if (value.length >= 2) {
                const suggestions = getSuggestions(value);
                this.renderSuggestions(suggestions, autocompleteContainer, inputElement);
            }
        });
        
        // Handle keyboard navigation
        inputElement.addEventListener('keydown', (e) => {
            const items = autocompleteContainer.querySelectorAll('li');
            if (!items.length) return;
            
            const active = autocompleteContainer.querySelector('.active');
            let index = -1;
            
            if (active) {
                index = Array.from(items).indexOf(active);
            }
            
            // Down arrow
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                index = (index + 1) % items.length;
                this.setActiveItem(items, index);
            }
            
            // Up arrow
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                index = (index - 1 + items.length) % items.length;
                this.setActiveItem(items, index);
            }
            
            // Enter key
            else if (e.key === 'Enter' && active) {
                e.preventDefault();
                active.click();
            }
            
            // Escape key
            else if (e.key === 'Escape') {
                autocompleteContainer.innerHTML = '';
            }
        });
    },
    
    /**
     * Set active item in autocomplete list
     * @param {NodeList} items - List items
     * @param {number} index - Index of active item
     */
    setActiveItem(items, index) {
        items.forEach(item => item.classList.remove('active'));
        items[index].classList.add('active');
        items[index].scrollIntoView({ block: 'nearest' });
    },
    
    /**
     * Render suggestions in the autocomplete container
     * @param {Array} suggestions - List of suggestions
     * @param {HTMLElement} container - Container to render suggestions in
     * @param {HTMLInputElement} inputElement - Input element
     */
    renderSuggestions(suggestions, container, inputElement) {
        container.innerHTML = '';
        
        if (suggestions.length === 0) {
            return;
        }
        
        const ul = document.createElement('ul');
        ul.className = 'autocomplete-list';
        
        suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.textContent = suggestion;
            li.addEventListener('click', () => {
                inputElement.value = suggestion;
                container.innerHTML = '';
                inputElement.dispatchEvent(new Event('change'));
            });
            ul.appendChild(li);
        });
        
        container.appendChild(ul);
    },
    
    /**
     * Get medication suggestions based on input
     * @param {string} input - User input
     * @returns {Array} - List of medication suggestions
     */
    getMedicationSuggestions(input) {
        const lowercaseInput = input.toLowerCase();
        const matches = [];
        
        // Search through medications and their aliases
        for (const med of this.medications) {
            // Check medication name
            if (med.name.toLowerCase().includes(lowercaseInput)) {
                matches.push(med.name);
                continue;
            }
            
            // Check aliases
            for (const alias of med.aliases || []) {
                if (alias.toLowerCase().includes(lowercaseInput)) {
                    matches.push(med.name);
                    break;
                }
            }
        }
        
        // Return unique matches (max 10)
        return [...new Set(matches)].slice(0, 10);
    },
    
    /**
     * Get formulation suggestions based on input
     * @param {string} input - User input
     * @returns {Array} - List of formulation suggestions
     */
    getFormulationSuggestions(input) {
        const lowercaseInput = input.toLowerCase();
        const matches = [];
        
        // Use formulations from the JSON file
        // Generate standardized formulation names from the categories
        const standardizedFormulations = Object.keys(this.formulations.formulations).map(category => {
            return category
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        });
        
        // Add standardized formulation names
        for (const formulation of standardizedFormulations) {
            if (formulation.toLowerCase().includes(lowercaseInput)) {
                matches.push(formulation);
            }
        }
        
        // Add all aliases from the JSON file
        for (const [category, aliases] of Object.entries(this.formulations.formulations)) {
            if (Array.isArray(aliases)) {
                for (const alias of aliases) {
                    if (alias.toLowerCase().includes(lowercaseInput)) {
                        matches.push(alias);
                    }
                }
            }
        }
        
        // Add specific formulations from drug warnings if available
        if (this.medicationWarnings && this.medicationWarnings.length > 0) {
            const uniqueFormulations = new Set();
            
            // Extract unique formulations from medication warnings
            this.medicationWarnings.forEach(med => {
                if (med.formulation && Array.isArray(med.formulation)) {
                    med.formulation.forEach(form => uniqueFormulations.add(form));
                }
            });
            
            // Add matching formulations to results
            for (const form of uniqueFormulations) {
                if (form.toLowerCase().includes(lowercaseInput)) {
                    matches.push(form);
                }
            }
        }
        
        // Return unique matches (max 15)
        return [...new Set(matches)].slice(0, 15);
    },
    
    /**
     * Process formulation categories recursively
     * @param {Object|Array} category - Category or array of formulations
     * @param {string} input - Lowercase input to match
     * @param {Array} matches - Array to add matches to
     */
    processFormulationCategory(category, input, matches) {
        // If it's an array, check each formulation
        if (Array.isArray(category)) {
            category.forEach(form => {
                if (typeof form === 'string' && form.toLowerCase().includes(input)) {
                    matches.push(form);
                }
            });
            return;
        }
        
        // If it's an object, process each property
        if (typeof category === 'object' && category !== null) {
            for (const key in category) {
                this.processFormulationCategory(category[key], input, matches);
            }
        }
    },
    
    /**
     * Update warning labels based on selected medication and formulation
     */
    updateWarningLabels() {
        const medicationName = document.getElementById('med-name').value.trim();
        const formulation = document.getElementById('med-form').value.trim();
        const additionalInfoField = document.getElementById('additional-info');
        
        // Always clear existing warnings when updating
        if (additionalInfoField) {
            // If the field contains warnings, clear it completely
            // This ensures a fresh start for new formulation warnings
            const currentContent = additionalInfoField.value;
            if (this.warningLabels.some(label => currentContent.includes(label.text))) {
                additionalInfoField.value = '';
            }
        }
        
        // If we don't have both medication and formulation, just clear warnings and return
        if (!medicationName || !formulation) {
            return;
        }
        
        // Find matching warning labels
        const labelNumbers = this.findWarningLabels(medicationName, formulation);
        
        // Get the warning texts
        const warnings = this.getWarningTexts(labelNumbers);
        
        // Update the additional info field with warnings
        if (additionalInfoField && warnings.length > 0) {
            additionalInfoField.value = warnings.join('\n\n');
        }
    },
    
    /**
     * Find warning label numbers for a medication and formulation
     * @param {string} medicationName - Medication name
     * @param {string} formulation - Medication formulation
     * @returns {Array} - List of warning label numbers
     */
    findWarningLabels(medicationName, formulation) {
        // Normalize inputs
        const normalizedMed = medicationName.toLowerCase();
        const normalizedForm = formulation.toLowerCase();
        
        // Get standardized formulation to handle aliases
        const standardizedForm = this.standardizeFormulation(normalizedForm);
        
        // Find matching medication in warnings
        for (const med of this.medicationWarnings) {
            // Check if medication name matches
            const medNames = med.name.map(name => name.toLowerCase());
            if (!medNames.some(name => normalizedMed.includes(name) || name.includes(normalizedMed))) {
                continue;
            }
            
            // Check if formulation matches (using both original and standardized forms)
            const formulations = med.formulation.map(form => form.toLowerCase());
            if (!formulations.some(form => 
                normalizedForm.includes(form) || 
                form.includes(normalizedForm) ||
                standardizedForm.includes(form) ||
                form.includes(standardizedForm) ||
                this.areFormulationsSimilar(form, normalizedForm)
            )) {
                continue;
            }
            
            // Return label numbers
            return med.label_number || [];
        }
        
        return [];
    },
    
    /**
     * Standardize formulation to handle aliases and synonyms
     * @param {string} formulation - Formulation to standardize
     * @returns {string} - Standardized formulation
     */
    standardizeFormulation(formulation) {
        if (!formulation) return '';
        
        const form = formulation.toLowerCase().trim();
        
        // Early return if empty
        if (form === '') return form;
        
        // Flattened structure - directly check each category
        for (const [category, aliases] of Object.entries(this.formulations.formulations)) {
            if (!Array.isArray(aliases)) continue;
            
            // Convert all aliases to lowercase for exact matching
            const lowerAliases = aliases.map(alias => alias.toLowerCase().trim());
            
            // Check for exact match or match with common variations
            if (lowerAliases.includes(form) || 
                // Also check plurals/singulars by adding/removing 's'
                (form.endsWith('s') && lowerAliases.includes(form.slice(0, -1))) ||
                (!form.endsWith('s') && lowerAliases.includes(form + 's'))) {
                
                // Return the standardized category name (convert underscores to spaces and capitalize first letters)
                return category
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }
        }
        
        // If we get here, no match was found - return the original
        return form;
    },
    
    /**
     * Check if two formulations are similar enough to be considered a match
     * @param {string} form1 - First formulation
     * @param {string} form2 - Second formulation
     * @returns {boolean} - True if formulations are similar
     */
    areFormulationsSimilar(form1, form2) {
        if (!form1 || !form2) return false;
        
        const normalizedForm1 = form1.toLowerCase().trim();
        const normalizedForm2 = form2.toLowerCase().trim();
        
        // If they're exactly the same, return true immediately
        if (normalizedForm1 === normalizedForm2) return true;
        
        // Standardize both formulations
        const standardizedForm1 = this.standardizeFormulation(normalizedForm1);
        const standardizedForm2 = this.standardizeFormulation(normalizedForm2);
        
        // If standardization produced the same result, they're similar
        if (standardizedForm1 === standardizedForm2) {
            return true;
        }
        
        // Check if both forms appear in the same alias group - use exact matching
        for (const [category, aliases] of Object.entries(this.formulations.formulations)) {
            if (!Array.isArray(aliases)) continue;
            
            // Convert all aliases to lowercase for comparison
            const lowerAliases = aliases.map(alias => alias.toLowerCase().trim());
            
            // Check if both forms are in the same alias list (exact matches only)
            const form1Match = lowerAliases.includes(normalizedForm1) || 
                              (normalizedForm1.endsWith('s') && lowerAliases.includes(normalizedForm1.slice(0, -1))) || 
                              (!normalizedForm1.endsWith('s') && lowerAliases.includes(normalizedForm1 + 's'));
                
            const form2Match = lowerAliases.includes(normalizedForm2) || 
                              (normalizedForm2.endsWith('s') && lowerAliases.includes(normalizedForm2.slice(0, -1))) || 
                              (!normalizedForm2.endsWith('s') && lowerAliases.includes(normalizedForm2 + 's'));
            
            if (form1Match && form2Match) {
                return true;
            }
        }
        
        return false;
    },
    
    /**
     * Get warning texts for a list of label numbers
     * @param {Array} labelNumbers - List of warning label numbers
     * @returns {Array} - List of warning texts
     */
    getWarningTexts(labelNumbers) {
        const warnings = [];
        
        for (const labelNum of labelNumbers) {
            const label = this.warningLabels.find(l => l.label_number === labelNum);
            if (label) {
                warnings.push(label.text);
            }
        }
        
        return warnings;
    }
};
