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
    
    // Pre-computed lookup indexes for performance
    _medNameIndex: null,      // Map: normalized name -> medication entry
    _aliasIndex: null,        // Map: normalized alias -> medication entry
    _warningIndex: null,      // Map: normalized drug name -> warning entries
    _normCache: new Map(),    // Cache for normalized strings
    
    /**
     * Convert a string to title case (capitalize first letter of each word)
     * Handles drug names with special characters like /, -, etc.
     * @param {string} str - String to convert
     * @returns {string} - Title-cased string
     */
    toTitleCase(str) {
        if (!str) return '';
        return str.replace(/\b\w/g, char => char.toUpperCase());
    },
    
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
            
            // Build lookup indexes for fast searching
            this._buildIndexes();
            
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
     * Build pre-computed indexes for fast lookups
     */
    _buildIndexes() {
        console.time('Building indexes');
        
        // Build medication name index
        this._medNameIndex = new Map();
        this._aliasIndex = new Map();
        
        for (const med of this.medications) {
            const normName = this._cachedNormalize(med.name);
            const canonName = this._cachedCanonicalize(med.name);
            
            this._medNameIndex.set(normName, med);
            this._medNameIndex.set(canonName, med);
            this._medNameIndex.set(med.name.toLowerCase().trim(), med);
            
            for (const alias of (med.aliases || [])) {
                const normAlias = this._cachedNormalize(alias);
                const canonAlias = this._cachedCanonicalize(alias);
                
                this._aliasIndex.set(normAlias, med);
                this._aliasIndex.set(canonAlias, med);
                this._aliasIndex.set(alias.toLowerCase().trim(), med);
            }
        }
        
        // Build warning index - map normalized drug names to warning entries
        this._warningIndex = new Map();
        
        for (const warning of this.medicationWarnings) {
            for (const name of warning.name) {
                const cleanName = name.replace(/-Specialist-Drug$/i, '');
                const normName = this._cachedNormalize(cleanName);
                const canonName = this._cachedCanonicalize(cleanName);
                
                // Store by multiple normalized forms
                [normName, canonName, cleanName.toLowerCase().trim()].forEach(key => {
                    if (!this._warningIndex.has(key)) {
                        this._warningIndex.set(key, []);
                    }
                    if (!this._warningIndex.get(key).includes(warning)) {
                        this._warningIndex.get(key).push(warning);
                    }
                });
            }
        }
        
        console.timeEnd('Building indexes');
        console.log('Index sizes - meds:', this._medNameIndex.size, 'aliases:', this._aliasIndex.size, 'warnings:', this._warningIndex.size);
    },
    
    /**
     * Cached normalize for drug names
     */
    _cachedNormalize(str) {
        if (!str) return '';
        const key = 'n:' + str;
        if (!this._normCache.has(key)) {
            this._normCache.set(key, this.normalizeDrugName(str));
        }
        return this._normCache.get(key);
    },
    
    /**
     * Cached canonicalize for drug names
     */
    _cachedCanonicalize(str) {
        if (!str) return '';
        const key = 'c:' + str;
        if (!this._normCache.has(key)) {
            this._normCache.set(key, this.canonicalizeDrugName(str));
        }
        return this._normCache.get(key);
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
        
        // Handle input events with debouncing for performance
        inputElement.addEventListener('input', () => {
            const value = inputElement.value.trim();
            if (value.length < 2) {
                autocompleteContainer.innerHTML = '';
                return;
            }
            
            // Debounce autocomplete suggestions
            clearTimeout(inputElement._autocompleteTimer);
            inputElement._autocompleteTimer = setTimeout(() => {
                const suggestions = getSuggestions(value);
                this.renderSuggestions(suggestions, autocompleteContainer, inputElement);
            }, 100); // 100ms debounce for responsive feel
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
            const titleCasedSuggestion = this.toTitleCase(suggestion);
            li.textContent = titleCasedSuggestion;
            li.addEventListener('click', () => {
                inputElement.value = titleCasedSuggestion;
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
        if (!input || input.trim() === '') {
            return [];
        }
        
        const lowercaseInput = input.toLowerCase().trim();
        const matches = [];
        const seen = new Set();
        const maxResults = 20;
        
        // Search through medications and their aliases with early termination
        for (const med of this.medications) {
            if (matches.length >= maxResults) break;
            
            const medNameLower = med.name.toLowerCase();
            const mainNameMatches = medNameLower.includes(lowercaseInput);
            
            // Check medication name (main name)
            if (mainNameMatches && !seen.has(medNameLower)) {
                seen.add(medNameLower);
                matches.push(med.name);
            }
            
            // Check aliases - only if we haven't hit the limit
            if (matches.length < maxResults) {
                for (const alias of med.aliases || []) {
                    if (matches.length >= maxResults) break;
                    
                    const aliasLower = alias.toLowerCase();
                    if (aliasLower.includes(lowercaseInput) && !seen.has(aliasLower)) {
                        // Add main name first if alias matches but main name doesn't
                        if (!mainNameMatches && !seen.has(medNameLower)) {
                            seen.add(medNameLower);
                            matches.push(med.name);
                        }
                        if (aliasLower !== medNameLower) {
                            seen.add(aliasLower);
                            matches.push(alias);
                        }
                    }
                }
            }
        }
        
        return matches.slice(0, maxResults);
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
     * Check if content contains warning text (cached for performance)
     * @param {string} content - Content to check
     * @returns {boolean} - True if content contains warnings
     */
    _hasWarningContent(content) {
        if (!content || content.trim() === '') return false;
        
        // Build and cache pattern on first use
        if (!this._warningPattern && this.warningLabels.length > 0) {
            // Create pattern from first few words of each warning for fast matching
            const patterns = this.warningLabels
                .slice(0, 10) // Only use first 10 warnings for pattern
                .map(label => {
                    // Get first 3-4 significant words from each warning
                    const words = label.text.split(/\s+/).slice(0, 4).join('\\s+');
                    return words;
                })
                .filter(p => p.length > 5);
            
            if (patterns.length > 0) {
                this._warningPattern = new RegExp(patterns.join('|'), 'i');
            }
        }
        
        // Fast pattern check
        if (this._warningPattern) {
            return this._warningPattern.test(content);
        }
        
        // Fallback: check for common warning phrases
        const commonPhrases = ['Warning:', 'Do not', 'Take with', 'Avoid', 'Keep out of'];
        return commonPhrases.some(phrase => content.includes(phrase));
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
            // Use cached pattern for fast detection instead of checking every label
            if (this._hasWarningContent(additionalInfoField.value)) {
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
     * Normalize drug name for consistent matching (handles hyphens/spaces)
     * @param {string} drugName - Drug name to normalize
     * @returns {string} - Normalized drug name
     */
    normalizeDrugName(drugName) {
        if (!drugName) return '';
        
        return drugName
            .toLowerCase()
            .trim()
            // Replace hyphens and multiple spaces with single spaces
            .replace(/[-\s]+/g, ' ')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Normalize all separators in drug names to a common format
     * Handles: /, -, "with", "and", "+" → single space
     * @param {string} drugName - Drug name to normalize
     * @returns {string} - Drug name with normalized separators
     */
    normalizeSeparators(drugName) {
        if (!drugName) return '';
        
        return drugName
            .toLowerCase()
            .trim()
            // Replace common combination separators with space
            .replace(/\s*\/\s*/g, ' ')           // forward slash
            .replace(/\s*-\s*/g, ' ')             // hyphen
            .replace(/\s*\+\s*/g, ' ')            // plus sign
            .replace(/\s+with\s+/gi, ' ')         // "with"
            .replace(/\s+and\s+/gi, ' ')          // "and"
            .replace(/\s+&\s+/g, ' ')             // ampersand
            // Clean up extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Create canonical (sorted) form of drug name for word-order-independent matching
     * e.g., "sodium docusate" and "docusate sodium" both become "docusate sodium"
     * @param {string} drugName - Drug name to canonicalize
     * @returns {string} - Canonicalized drug name with words sorted alphabetically
     */
    canonicalizeDrugName(drugName) {
        if (!drugName) return '';
        
        // First normalize all separators
        const normalized = this.normalizeSeparators(drugName);
        
        // Split into words, sort alphabetically, rejoin
        const words = normalized.split(' ').filter(w => w.length > 0);
        words.sort();
        
        return words.join(' ');
    },

    /**
     * Check if two drug names match using flexible matching
     * Handles: different word order, different separators (/, -, with, and)
     * @param {string} name1 - First drug name
     * @param {string} name2 - Second drug name
     * @returns {boolean} - True if names match
     */
    drugNamesMatch(name1, name2) {
        if (!name1 || !name2) return false;
        
        // Quick exact match check first
        const lower1 = name1.toLowerCase().trim();
        const lower2 = name2.toLowerCase().trim();
        if (lower1 === lower2) return true;
        
        // Normalize separators and compare
        const norm1 = this.normalizeSeparators(name1);
        const norm2 = this.normalizeSeparators(name2);
        if (norm1 === norm2) return true;
        
        // Compare canonical (sorted word) forms for word-order independence
        const canon1 = this.canonicalizeDrugName(name1);
        const canon2 = this.canonicalizeDrugName(name2);
        if (canon1 === canon2) return true;
        
        return false;
    },

    /**
     * Standardize medication name based on drug aliases
     * @param {string} medicationName - Medication name to standardize
     * @returns {string} - Standardized medication name
     */
    standardizeMedicationName(medicationName) {
        if (!medicationName) return '';
        
        const normalizedMed = this._cachedNormalize(medicationName);
        const canonicalMed = this._cachedCanonicalize(medicationName);
        
        // Early return if empty
        if (normalizedMed === '') return normalizedMed;
        
        // Fast path: Use pre-built indexes for O(1) lookup
        if (this._medNameIndex || this._aliasIndex) {
            const med = this._medNameIndex?.get(normalizedMed) || 
                        this._medNameIndex?.get(canonicalMed) ||
                        this._medNameIndex?.get(medicationName.toLowerCase().trim()) ||
                        this._aliasIndex?.get(normalizedMed) ||
                        this._aliasIndex?.get(canonicalMed) ||
                        this._aliasIndex?.get(medicationName.toLowerCase().trim());
            
            if (med) {
                return med.name.toLowerCase().trim();
            }
        }
        
        // If no match was found, return the original normalized version
        return normalizedMed;
    },
    
    /**
     * Find warning label numbers for a medication and formulation
     * @param {string} medicationName - Medication name
     * @param {string} formulation - Medication formulation
     * @returns {Array} - List of warning label numbers
     */
    findWarningLabels(medicationName, formulation) {
        // Use cached normalizations for performance
        const normalizedMed = this._cachedNormalize(medicationName);
        const canonicalMed = this._cachedCanonicalize(medicationName);
        const normalizedForm = formulation.toLowerCase().trim();
        const standardizedForm = this.standardizeFormulation(normalizedForm);
        
        // Fast path: Try direct index lookup first
        let warnings = this._warningIndex?.get(normalizedMed) || 
                       this._warningIndex?.get(canonicalMed) ||
                       this._warningIndex?.get(medicationName.toLowerCase().trim());
        
        // If no direct match, try to find via medication aliases using index
        if (!warnings || warnings.length === 0) {
            const med = this._medNameIndex?.get(normalizedMed) || 
                        this._medNameIndex?.get(canonicalMed) ||
                        this._aliasIndex?.get(normalizedMed) ||
                        this._aliasIndex?.get(canonicalMed);
            
            if (med) {
                // Try main name and all aliases
                const namesToTry = [
                    this._cachedNormalize(med.name),
                    this._cachedCanonicalize(med.name),
                    ...(med.aliases || []).flatMap(a => [
                        this._cachedNormalize(a),
                        this._cachedCanonicalize(a)
                    ])
                ];
                
                for (const name of namesToTry) {
                    warnings = this._warningIndex?.get(name);
                    if (warnings && warnings.length > 0) break;
                }
            }
        }
        
        // Check formulation match for found warnings
        if (warnings && warnings.length > 0) {
            for (const warning of warnings) {
                const formulations = warning.formulation.map(f => f.toLowerCase().trim());
                const formMatch = formulations.some(form => 
                    normalizedForm.includes(form) || 
                    form.includes(normalizedForm) ||
                    standardizedForm.includes(form) ||
                    form.includes(standardizedForm) ||
                    this.areFormulationsSimilar(form, normalizedForm)
                );
                
                if (formMatch) {
                    return warning.label_number || [];
                }
            }
        }
        
        // Fallback: Full search if indexes not built or no match found
        if (!this._warningIndex) {
            return this._findWarningLabelsFallback(medicationName, formulation);
        }
        
        return [];
    },
    
    /**
     * Fallback warning label search (used when indexes not available)
     */
    _findWarningLabelsFallback(medicationName, formulation) {
        const normalizedMed = this._cachedNormalize(medicationName);
        const canonicalMed = this._cachedCanonicalize(medicationName);
        const normalizedForm = formulation.toLowerCase().trim();
        const standardizedForm = this.standardizeFormulation(normalizedForm);
        
        for (const med of this.medicationWarnings) {
            // Check medication match
            const isMedMatch = med.name.some(name => {
                const cleanName = name.replace(/-Specialist-Drug$/i, '');
                const normName = this._cachedNormalize(cleanName);
                const canonName = this._cachedCanonicalize(cleanName);
                
                return normName === normalizedMed || 
                       canonName === canonicalMed ||
                       this.drugNamesMatch(medicationName, cleanName);
            });
            
            if (!isMedMatch) continue;
            
            // Check formulation match
            const formulations = med.formulation.map(f => f.toLowerCase().trim());
            const formMatch = formulations.some(form => 
                normalizedForm.includes(form) || 
                form.includes(normalizedForm) ||
                standardizedForm.includes(form) ||
                form.includes(standardizedForm)
            );
            
            if (formMatch) {
                return med.label_number || [];
            }
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
