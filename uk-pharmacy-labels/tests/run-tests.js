#!/usr/bin/env node
/**
 * Warning Label Matching Tests - Node.js CLI Version
 * Run with: node tests/run-tests.js
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

// Test cases - same as browser version
const TEST_CASES = [
    {
        group: "Basic Medication Matching",
        tests: [
            { med: "Amoxicillin", form: "Oral capsule", expectLabels: [9], desc: "Standard name" },
            { med: "amoxicillin", form: "oral capsule", expectLabels: [9], desc: "Lowercase" },
            { med: "AMOXICILLIN", form: "ORAL CAPSULE", expectLabels: [9], desc: "Uppercase" },
            { med: "  Amoxicillin  ", form: "  Oral capsule  ", expectLabels: [9], desc: "With whitespace" },
            { med: "Metformin", form: "Oral tablet", expectLabels: [21], desc: "Metformin tablet" },
            { med: "Warfarin Sodium", form: "Oral tablet", expectLabels: [10], desc: "Warfarin tablet" },
        ]
    },
    {
        group: "Hydrochloride/Salt Forms",
        tests: [
            { med: "Tramadol", form: "Oral capsule", expectLabels: [2], desc: "Tramadol capsule" },
            { med: "Tramadol Hydrochloride", form: "Oral capsule", expectLabels: [2], desc: "With hydrochloride" },
            { med: "tramadol hydrochloride", form: "oral capsule", expectLabels: [2], desc: "Lowercase hydrochloride" },
            { med: "Tramadol-Hydrochloride", form: "Oral capsule", expectLabels: [2], desc: "Hyphenated hydrochloride" },
            { med: "Tramadol", form: "Modified-release tablet", expectLabels: [2, 25], desc: "Tramadol MR tablet" },
            { med: "Lercanidipine", form: "Oral tablet", expectLabels: [22], desc: "Lercanidipine base" },
            { med: "Lercanidipine Hydrochloride", form: "Oral tablet", expectLabels: [22], desc: "Lercanidipine hydrochloride" },
            { med: "lercanidipine-hydrochloride", form: "oral tablet", expectLabels: [22], desc: "Hyphenated lowercase" },
            { med: "Diltiazem", form: "Modified-release tablet", expectLabels: [25], desc: "Diltiazem MR tablet" },
            { med: "Diltiazem Hydrochloride", form: "Modified-release capsule", expectLabels: [25], desc: "Diltiazem MR capsule" },
            { med: "Metformin Hydrochloride", form: "Oral tablet", expectLabels: [21], desc: "Metformin hydrochloride" },
        ]
    },
    {
        group: "Word Order Variations",
        tests: [
            { med: "Docusate Sodium", form: "Oral capsule", expectLabels: [], desc: "Docusate - no warnings" },
            { med: "Sodium Docusate", form: "Oral capsule", expectLabels: [], desc: "Reversed - no warnings" },
            { med: "Ferrous Sulfate", form: "Modified-release tablet", expectLabels: [25], desc: "Ferrous sulfate MR" },
            { med: "Warfarin Sodium", form: "Oral tablet", expectLabels: [10], desc: "Warfarin sodium" },
            { med: "Sodium Warfarin", form: "Oral tablet", expectLabels: [10], desc: "Reversed warfarin" },
        ]
    },
    {
        group: "Combination Drug Separators",
        tests: [
            { med: "Co-codamol", form: "Oral tablet", expectLabels: [2, 29, 30], desc: "Co-codamol tablet" },
            { med: "Co-codamol", form: "Oral capsule", expectLabels: [2, 29, 30], desc: "Co-codamol capsule" },
            { med: "Tramadol with Paracetamol", form: "Oral tablet", expectLabels: [2, 25, 29, 30], desc: "Tramadol/paracetamol tablet" },
            { med: "Tramadol/Paracetamol", form: "Oral tablet", expectLabels: [2, 25, 29, 30], desc: "Slash separator" },
            { med: "Paracetamol with Tramadol", form: "Oral tablet", expectLabels: [2, 25, 29, 30], desc: "Reversed order" },
        ]
    },
    {
        group: "Formulation Variations",
        tests: [
            { med: "Amoxicillin", form: "Capsule", expectLabels: [9], desc: "Short form - capsule" },
            { med: "Amoxicillin", form: "Capsules", expectLabels: [9], desc: "Plural - capsules" },
            { med: "Amoxicillin", form: "Oral capsules", expectLabels: [9], desc: "Oral capsules" },
            { med: "Amoxicillin", form: "caps", expectLabels: [9], desc: "Abbreviation - caps" },
            { med: "Metformin", form: "Tablet", expectLabels: [21], desc: "Short form - tablet" },
            { med: "Metformin", form: "Tablets", expectLabels: [21], desc: "Plural - tablets" },
            { med: "Metformin", form: "Oral tablets", expectLabels: [21], desc: "Oral tablets" },
            { med: "Metformin", form: "tab", expectLabels: [21], desc: "Abbreviation - tab" },
            { med: "Metformin", form: "tabs", expectLabels: [21], desc: "Abbreviation - tabs" },
        ]
    },
    {
        group: "Brand Name Matching",
        tests: [
            { med: "Augmentin", form: "Oral tablet", expectLabels: [9], desc: "Augmentin (amoxicillin/clavulanic)" },
            { med: "Nurofen", form: "Oral tablet", expectLabels: [21], desc: "Nurofen (ibuprofen)" },
            { med: "Zanidip", form: "Oral tablet", expectLabels: [22], desc: "Zanidip (lercanidipine)" },
            { med: "Diclofenac Potassium", form: "Oral tablet", expectLabels: [21], desc: "Diclofenac potassium tablet" },
        ]
    },
    {
        group: "Complex Combinations",
        tests: [
            { med: "Fluticasone with Salmeterol", form: "Inhalation powder", expectLabels: [8, 10], desc: "Fluticasone/Salmeterol" },
            { med: "Fluticasone/Salmeterol", form: "Inhalation powder", expectLabels: [8, 10], desc: "Slash separator" },
            { med: "Salmeterol with Fluticasone", form: "Inhalation powder", expectLabels: [8, 10], desc: "Reversed order" },
            { med: "Budesonide with Formoterol", form: "Inhalation powder", expectLabels: [8, 10], desc: "Budesonide/Formoterol" },
            { med: "Oxycodone with Naloxone", form: "Modified-release tablet", expectLabels: [2, 25], desc: "Oxycodone/Naloxone MR" },
        ]
    },
    {
        group: "No Match Expected",
        tests: [
            { med: "NotARealDrug", form: "Oral tablet", expectLabels: [], desc: "Non-existent drug" },
            { med: "Amoxicillin", form: "Intravenous injection", expectLabels: [], desc: "Wrong formulation" },
            { med: "", form: "Oral tablet", expectLabels: [], desc: "Empty medication" },
            { med: "Amoxicillin", form: "", expectLabels: [], desc: "Empty formulation" },
        ]
    },
    {
        group: "Steroid Formulations",
        tests: [
            { med: "Prednisolone", form: "Oral tablet", expectLabels: [10, 21], desc: "Prednisolone tablet" },
            { med: "Beclometasone", form: "Inhalation powder", expectLabels: [8, 10], desc: "Beclometasone inhaler" },
            { med: "Beclometasone Dipropionate", form: "Inhalation powder", expectLabels: [8, 10], desc: "With dipropionate" },
            { med: "Hydrocortisone", form: "Cutaneous cream", expectLabels: [28], desc: "Hydrocortisone cream" },
            { med: "Mometasone", form: "Cutaneous cream", expectLabels: [28], desc: "Mometasone cream" },
            { med: "Mometasone Furoate", form: "Cutaneous cream", expectLabels: [28], desc: "Mometasone furoate cream" },
        ]
    },
    {
        group: "Antibiotics",
        tests: [
            { med: "Doxycycline", form: "Oral capsule", expectLabels: [6, 9, 11, 27], desc: "Doxycycline capsule" },
            { med: "Ciprofloxacin", form: "Oral tablet", expectLabels: [7, 9, 25], desc: "Ciprofloxacin tablet" },
            { med: "Metronidazole", form: "Oral tablet", expectLabels: [4, 9, 21, 25, 27], desc: "Metronidazole tablet" },
            { med: "Metronidazole", form: "Oral suspension", expectLabels: [4, 9], desc: "Metronidazole suspension" },
            { med: "Clarithromycin", form: "Oral tablet", expectLabels: [9], desc: "Clarithromycin tablet" },
            { med: "Flucloxacillin", form: "Oral capsule", expectLabels: [9, 23], desc: "Flucloxacillin capsule" },
        ]
    },
    {
        group: "Controlled Drugs",
        tests: [
            { med: "Morphine", form: "Oral tablet", expectLabels: [2], desc: "Morphine tablet" },
            { med: "Oxycodone", form: "Oral capsule", expectLabels: [2], desc: "Oxycodone capsule" },
            { med: "Oxycodone Hydrochloride", form: "Oral capsule", expectLabels: [2], desc: "Oxycodone HCl capsule" },
            { med: "Fentanyl", form: "Transdermal patch", expectLabels: [2], desc: "Fentanyl patch" },
            { med: "Diazepam", form: "Oral tablet", expectLabels: [2], desc: "Diazepam tablet" },
            { med: "Lorazepam", form: "Oral tablet", expectLabels: [2], desc: "Lorazepam tablet" },
        ]
    },
];

// Create a simplified MedicationManager for Node.js
function createMedicationManager(medications, formulations, warningLabels, medicationWarnings) {
    const manager = {
        medications,
        formulations,
        warningLabels,
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

// Compare arrays
function arraysEqual(a, b) {
    const aSorted = [...a].sort((x, y) => x - y);
    const bSorted = [...b].sort((x, y) => x - y);
    return aSorted.length === bSorted.length && aSorted.every((v, i) => v === bSorted[i]);
}

// Main test runner
async function runTests() {
    console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║       Warning Label Matching Tests                         ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Load data
    const dataDir = path.join(__dirname, '..', 'data');
    
    console.log(`${colors.dim}Loading data files...${colors.reset}`);
    
    const medications = JSON.parse(fs.readFileSync(path.join(dataDir, 'drug_aliases.json'), 'utf8'));
    const formulations = JSON.parse(fs.readFileSync(path.join(dataDir, 'formulation_aliases.json'), 'utf8'));
    const warnings = JSON.parse(fs.readFileSync(path.join(dataDir, 'bnf_labels.json'), 'utf8'));
    const medicationWarnings = JSON.parse(fs.readFileSync(path.join(dataDir, 'drug_formulations_warnings.json'), 'utf8'));

    console.log(`${colors.dim}  Medications: ${medications.length}${colors.reset}`);
    console.log(`${colors.dim}  Warnings: ${medicationWarnings.length}${colors.reset}`);
    console.log(`${colors.dim}Building indexes...${colors.reset}\n`);

    const manager = createMedicationManager(medications, formulations, warnings.cautionary_advisory_labels, medicationWarnings);

    let totalPassed = 0;
    let totalFailed = 0;
    const failures = [];

    for (const group of TEST_CASES) {
        let groupPassed = 0;
        let groupFailed = 0;

        for (const test of group.tests) {
            const actual = manager.findWarningLabels(test.med, test.form);
            const passed = arraysEqual(actual, test.expectLabels);

            if (passed) {
                groupPassed++;
                totalPassed++;
            } else {
                groupFailed++;
                totalFailed++;
                failures.push({
                    group: group.group,
                    test: test,
                    actual: actual
                });
            }
        }

        const icon = groupFailed === 0 ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
        const countColor = groupFailed === 0 ? colors.green : colors.red;
        console.log(`${icon} ${group.group} ${colors.dim}(${countColor}${groupPassed}/${group.tests.length}${colors.reset}${colors.dim} passed)${colors.reset}`);
    }

    // Summary
    console.log(`\n${colors.bold}════════════════════════════════════════════════════════════${colors.reset}`);
    
    if (totalFailed === 0) {
        console.log(`${colors.green}${colors.bold}✓ All ${totalPassed} tests passed!${colors.reset}`);
    } else {
        console.log(`${colors.red}${colors.bold}✗ ${totalFailed} of ${totalPassed + totalFailed} tests failed${colors.reset}`);
        
        console.log(`\n${colors.bold}Failed Tests:${colors.reset}\n`);
        
        for (const failure of failures) {
            console.log(`${colors.red}✗${colors.reset} ${colors.bold}${failure.group}${colors.reset} - ${failure.test.desc}`);
            console.log(`  Medication: "${failure.test.med}" | Formulation: "${failure.test.form}"`);
            console.log(`  Expected: [${failure.test.expectLabels.join(', ')}]`);
            console.log(`  Actual:   [${failure.actual.join(', ')}]\n`);
        }
    }

    console.log(`${colors.bold}════════════════════════════════════════════════════════════${colors.reset}`);
    
    process.exit(totalFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error(`${colors.red}Error running tests:${colors.reset}`, err);
    process.exit(1);
});
