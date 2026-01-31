#!/usr/bin/env node
/**
 * Comprehensive Warning Label Matching Tests
 * Generates extensive tests from actual data files
 * Run with: node tests/comprehensive-tests.js
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
    bold: '\x1b[1m'
};

// Load data files
const dataDir = path.join(__dirname, '..', 'data');
const medications = JSON.parse(fs.readFileSync(path.join(dataDir, 'drug_aliases.json'), 'utf8'));
const formulations = JSON.parse(fs.readFileSync(path.join(dataDir, 'formulation_aliases.json'), 'utf8'));
const warningsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'bnf_labels.json'), 'utf8'));
const medicationWarnings = JSON.parse(fs.readFileSync(path.join(dataDir, 'drug_formulations_warnings.json'), 'utf8'));

// Create MedicationManager (simplified for testing)
function createMedicationManager() {
    const manager = {
        medications,
        formulations,
        warningLabels: warningsData.cautionary_advisory_labels,
        medicationWarnings,
        _medNameIndex: null,
        _aliasIndex: null,
        _warningIndex: null,
        _normCache: new Map(),

        normalizeDrugName(drugName) {
            if (!drugName) return '';
            return drugName.toLowerCase().trim().replace(/[-\s]+/g, ' ').replace(/\s+/g, ' ').trim();
        },

        normalizeSeparators(drugName) {
            if (!drugName) return '';
            return drugName.toLowerCase().trim()
                .replace(/\s*\/\s*/g, ' ')
                .replace(/\s*-\s*/g, ' ')
                .replace(/\s*\+\s*/g, ' ')
                .replace(/\s+with\s+/gi, ' ')
                .replace(/\s+and\s+/gi, ' ')
                .replace(/\s+&\s+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        },

        canonicalizeDrugName(drugName) {
            if (!drugName) return '';
            const normalized = this.normalizeSeparators(drugName);
            const words = normalized.split(' ').filter(w => w.length > 0);
            words.sort();
            return words.join(' ');
        },

        _cachedNormalize(str) {
            if (!str) return '';
            const key = 'n:' + str;
            if (!this._normCache.has(key)) {
                this._normCache.set(key, this.normalizeDrugName(str));
            }
            return this._normCache.get(key);
        },

        _cachedCanonicalize(str) {
            if (!str) return '';
            const key = 'c:' + str;
            if (!this._normCache.has(key)) {
                this._normCache.set(key, this.canonicalizeDrugName(str));
            }
            return this._normCache.get(key);
        },

        _buildIndexes() {
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

            this._warningIndex = new Map();

            for (const warning of this.medicationWarnings) {
                for (const name of warning.name) {
                    const cleanName = name.replace(/-Specialist-Drug$/i, '');
                    const normName = this._cachedNormalize(cleanName);
                    const canonName = this._cachedCanonicalize(cleanName);

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
        },

        standardizeFormulation(formulation) {
            if (!formulation) return '';
            const form = formulation.toLowerCase().trim();
            if (form === '') return form;

            for (const [category, aliases] of Object.entries(this.formulations.formulations || {})) {
                if (!Array.isArray(aliases)) continue;
                const lowerAliases = aliases.map(alias => alias.toLowerCase().trim());

                if (lowerAliases.includes(form) ||
                    (form.endsWith('s') && lowerAliases.includes(form.slice(0, -1))) ||
                    (!form.endsWith('s') && lowerAliases.includes(form + 's'))) {
                    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                }
            }
            return form;
        },

        areFormulationsSimilar(form1, form2) {
            if (!form1 || !form2) return false;
            const nf1 = form1.toLowerCase().trim();
            const nf2 = form2.toLowerCase().trim();
            if (nf1 === nf2) return true;

            const sf1 = this.standardizeFormulation(nf1);
            const sf2 = this.standardizeFormulation(nf2);
            if (sf1 === sf2) return true;

            for (const [category, aliases] of Object.entries(this.formulations.formulations || {})) {
                if (!Array.isArray(aliases)) continue;
                const lowerAliases = aliases.map(alias => alias.toLowerCase().trim());

                const f1Match = lowerAliases.includes(nf1) ||
                    (nf1.endsWith('s') && lowerAliases.includes(nf1.slice(0, -1))) ||
                    (!nf1.endsWith('s') && lowerAliases.includes(nf1 + 's'));

                const f2Match = lowerAliases.includes(nf2) ||
                    (nf2.endsWith('s') && lowerAliases.includes(nf2.slice(0, -1))) ||
                    (!nf2.endsWith('s') && lowerAliases.includes(nf2 + 's'));

                if (f1Match && f2Match) return true;
            }
            return false;
        },

        findWarningLabels(medicationName, formulation) {
            if (!medicationName || !formulation) return [];

            const normalizedMed = this._cachedNormalize(medicationName);
            const canonicalMed = this._cachedCanonicalize(medicationName);
            const normalizedForm = formulation.toLowerCase().trim();
            const standardizedForm = this.standardizeFormulation(normalizedForm);

            let warnings = this._warningIndex?.get(normalizedMed) ||
                this._warningIndex?.get(canonicalMed) ||
                this._warningIndex?.get(medicationName.toLowerCase().trim());

            if (!warnings || warnings.length === 0) {
                const med = this._medNameIndex?.get(normalizedMed) ||
                    this._medNameIndex?.get(canonicalMed) ||
                    this._aliasIndex?.get(normalizedMed) ||
                    this._aliasIndex?.get(canonicalMed);

                if (med) {
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

            return [];
        }
    };

    manager._buildIndexes();
    return manager;
}

// Generate name variations for a drug name
function generateNameVariations(name) {
    const variations = new Set();
    variations.add(name);
    variations.add(name.toLowerCase());
    variations.add(name.toUpperCase());
    variations.add(name.toLowerCase().replace(/-/g, ' '));
    variations.add(name.toLowerCase().replace(/ /g, '-'));
    variations.add('  ' + name + '  '); // whitespace
    
    // Word order variations for multi-word names
    const words = name.replace(/-/g, ' ').split(' ').filter(w => w);
    if (words.length === 2) {
        variations.add(words[1] + ' ' + words[0]);
        variations.add(words[1] + '-' + words[0]);
    }
    
    return Array.from(variations);
}

// Generate formulation variations
function generateFormulationVariations(formulation) {
    const variations = new Set();
    variations.add(formulation);
    variations.add(formulation.toLowerCase());
    
    // Add common variations
    const lower = formulation.toLowerCase();
    if (lower.includes('tablet')) {
        variations.add('tablet');
        variations.add('tablets');
        variations.add('tab');
        variations.add('tabs');
        variations.add('Oral tablet');
        variations.add('oral tablets');
    }
    if (lower.includes('capsule')) {
        variations.add('capsule');
        variations.add('capsules');
        variations.add('caps');
        variations.add('Oral capsule');
        variations.add('oral capsules');
    }
    if (lower.includes('solution')) {
        variations.add('solution');
        variations.add('oral solution');
        variations.add('liquid');
    }
    if (lower.includes('cream')) {
        variations.add('cream');
        variations.add('topical cream');
        variations.add('cutaneous cream');
    }
    if (lower.includes('ointment')) {
        variations.add('ointment');
        variations.add('topical ointment');
        variations.add('cutaneous ointment');
    }
    if (lower.includes('suspension')) {
        variations.add('suspension');
        variations.add('oral suspension');
    }
    if (lower.includes('modified-release') || lower.includes('modified release')) {
        variations.add('MR tablet');
        variations.add('MR capsule');
        variations.add('slow release');
        variations.add('SR');
    }
    if (lower.includes('inhalation')) {
        variations.add('inhaler');
        variations.add('inhalation');
        variations.add('inhalation powder');
    }
    
    return Array.from(variations);
}

// Main test runner
async function runComprehensiveTests() {
    console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║       COMPREHENSIVE Warning Label Matching Tests                   ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.dim}Building medication manager...${colors.reset}`);
    const manager = createMedicationManager();

    console.log(`${colors.dim}Data loaded:${colors.reset}`);
    console.log(`${colors.dim}  - Medications/aliases: ${medications.length}${colors.reset}`);
    console.log(`${colors.dim}  - Warning entries: ${medicationWarnings.length}${colors.reset}`);
    console.log(`${colors.dim}  - Formulation categories: ${Object.keys(formulations.formulations || {}).length}${colors.reset}\n`);

    // Build test cases from actual warning data
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    const failures = [];
    const testGroups = {};

    console.log(`${colors.bold}Generating and running tests...${colors.reset}\n`);

    // For each warning entry, test that all drug name variations match
    for (const warning of medicationWarnings) {
        for (const drugName of warning.name) {
            const cleanName = drugName.replace(/-Specialist-Drug$/i, '');
            const expectedLabels = warning.label_number || [];
            
            // Find matching medication entry to get all aliases
            const normName = manager._cachedNormalize(cleanName);
            const med = manager._medNameIndex?.get(normName) || 
                        manager._aliasIndex?.get(normName);
            
            // Collect all names to test (main name + aliases)
            const namesToTest = [cleanName];
            if (med) {
                namesToTest.push(med.name);
                namesToTest.push(...(med.aliases || []));
            }
            
            // Test each formulation for this drug
            for (const formulation of warning.formulation) {
                const formVariations = generateFormulationVariations(formulation);
                
                // Test with original drug name and variations
                for (const testName of namesToTest) {
                    const nameVariations = generateNameVariations(testName);
                    
                    for (const nameVar of nameVariations) {
                        for (const formVar of formVariations) {
                            totalTests++;
                            
                            const result = manager.findWarningLabels(nameVar, formVar);
                            const resultSorted = [...result].sort((a,b) => a-b);
                            const expectedSorted = [...expectedLabels].sort((a,b) => a-b);
                            
                            const testPassed = resultSorted.length === expectedSorted.length &&
                                resultSorted.every((v, i) => v === expectedSorted[i]);
                            
                            const groupKey = cleanName.substring(0, 1).toUpperCase();
                            if (!testGroups[groupKey]) {
                                testGroups[groupKey] = { passed: 0, failed: 0, tests: [] };
                            }
                            
                            if (testPassed) {
                                passed++;
                                testGroups[groupKey].passed++;
                            } else {
                                failed++;
                                testGroups[groupKey].failed++;
                                
                                // Only store first few failures per drug to avoid overwhelming output
                                if (failures.length < 100) {
                                    failures.push({
                                        drug: nameVar,
                                        formulation: formVar,
                                        expected: expectedLabels,
                                        actual: result,
                                        originalDrug: cleanName,
                                        originalForm: formulation
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Print summary by letter group
    console.log(`${colors.bold}Results by drug name (first letter):${colors.reset}`);
    const letters = Object.keys(testGroups).sort();
    for (const letter of letters) {
        const group = testGroups[letter];
        const total = group.passed + group.failed;
        const pct = ((group.passed / total) * 100).toFixed(1);
        const icon = group.failed === 0 ? `${colors.green}✓${colors.reset}` : `${colors.yellow}~${colors.reset}`;
        console.log(`  ${icon} ${letter}: ${group.passed}/${total} (${pct}%)`);
    }

    // Print overall summary
    console.log(`\n${colors.bold}════════════════════════════════════════════════════════════════════${colors.reset}`);
    const passRate = ((passed / totalTests) * 100).toFixed(2);
    
    if (failed === 0) {
        console.log(`${colors.green}${colors.bold}✓ All ${totalTests.toLocaleString()} tests passed!${colors.reset}`);
    } else {
        console.log(`${colors.yellow}${colors.bold}Results: ${passed.toLocaleString()} / ${totalTests.toLocaleString()} tests passed (${passRate}%)${colors.reset}`);
        console.log(`${colors.red}Failed: ${failed.toLocaleString()} tests${colors.reset}`);
    }
    
    console.log(`${colors.bold}════════════════════════════════════════════════════════════════════${colors.reset}`);

    // Print some failure examples if any
    if (failures.length > 0) {
        console.log(`\n${colors.bold}Sample failures (showing first ${Math.min(failures.length, 20)}):${colors.reset}\n`);
        
        for (let i = 0; i < Math.min(failures.length, 20); i++) {
            const f = failures[i];
            console.log(`${colors.red}✗${colors.reset} "${f.drug}" + "${f.formulation}"`);
            console.log(`  ${colors.dim}Original: ${f.originalDrug} | ${f.originalForm}${colors.reset}`);
            console.log(`  Expected: [${f.expected.join(', ')}] | Got: [${f.actual.join(', ')}]\n`);
        }
        
        if (failures.length > 20) {
            console.log(`${colors.dim}... and ${failures.length - 20} more failures${colors.reset}`);
        }
    }

    // Additional statistics
    console.log(`\n${colors.bold}Test Statistics:${colors.reset}`);
    console.log(`  Total test combinations: ${totalTests.toLocaleString()}`);
    console.log(`  Unique drugs tested: ${new Set(medicationWarnings.flatMap(w => w.name)).size}`);
    console.log(`  Drug aliases available: ${medications.reduce((sum, m) => sum + (m.aliases?.length || 0), 0)}`);
    console.log(`  Formulation categories: ${Object.keys(formulations.formulations || {}).length}`);
    
    process.exit(failed > 0 ? 1 : 0);
}

runComprehensiveTests().catch(err => {
    console.error(`${colors.red}Error running tests:${colors.reset}`, err);
    process.exit(1);
});
