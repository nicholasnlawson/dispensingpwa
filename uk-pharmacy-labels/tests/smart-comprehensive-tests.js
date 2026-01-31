#!/usr/bin/env node
/**
 * Smart Comprehensive Warning Label Matching Tests
 * Tests exact formulation matches and validates alias resolution
 * Run with: node tests/smart-comprehensive-tests.js
 */

const fs = require('fs');
const path = require('path');

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

// Create MedicationManager
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
                .replace(/\s*\/\s*/g, ' ').replace(/\s*-\s*/g, ' ').replace(/\s*\+\s*/g, ' ')
                .replace(/\s+with\s+/gi, ' ').replace(/\s+and\s+/gi, ' ').replace(/\s+&\s+/g, ' ')
                .replace(/\s+/g, ' ').trim();
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
            if (!this._normCache.has(key)) this._normCache.set(key, this.normalizeDrugName(str));
            return this._normCache.get(key);
        },

        _cachedCanonicalize(str) {
            if (!str) return '';
            const key = 'c:' + str;
            if (!this._normCache.has(key)) this._normCache.set(key, this.canonicalizeDrugName(str));
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
                        if (!this._warningIndex.has(key)) this._warningIndex.set(key, []);
                        if (!this._warningIndex.get(key).includes(warning)) this._warningIndex.get(key).push(warning);
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
                const f1Match = lowerAliases.includes(nf1) || (nf1.endsWith('s') && lowerAliases.includes(nf1.slice(0, -1))) || (!nf1.endsWith('s') && lowerAliases.includes(nf1 + 's'));
                const f2Match = lowerAliases.includes(nf2) || (nf2.endsWith('s') && lowerAliases.includes(nf2.slice(0, -1))) || (!nf2.endsWith('s') && lowerAliases.includes(nf2 + 's'));
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

            let warnings = this._warningIndex?.get(normalizedMed) || this._warningIndex?.get(canonicalMed) || this._warningIndex?.get(medicationName.toLowerCase().trim());

            if (!warnings || warnings.length === 0) {
                const med = this._medNameIndex?.get(normalizedMed) || this._medNameIndex?.get(canonicalMed) || 
                            this._medNameIndex?.get(medicationName.toLowerCase().trim()) ||
                            this._aliasIndex?.get(normalizedMed) || this._aliasIndex?.get(canonicalMed) ||
                            this._aliasIndex?.get(medicationName.toLowerCase().trim());
                if (med) {
                    const namesToTry = [
                        this._cachedNormalize(med.name), 
                        this._cachedCanonicalize(med.name),
                        med.name.toLowerCase().trim(),
                        ...(med.aliases || []).flatMap(a => [this._cachedNormalize(a), this._cachedCanonicalize(a), a.toLowerCase().trim()])
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
                    const formMatch = formulations.some(form => normalizedForm.includes(form) || form.includes(normalizedForm) || standardizedForm.includes(form) || form.includes(standardizedForm) || this.areFormulationsSimilar(form, normalizedForm));
                    if (formMatch) return warning.label_number || [];
                }
            }
            return [];
        }
    };
    manager._buildIndexes();
    return manager;
}

function arraysEqual(a, b) {
    const aSorted = [...a].sort((x, y) => x - y);
    const bSorted = [...b].sort((x, y) => x - y);
    return aSorted.length === bSorted.length && aSorted.every((v, i) => v === bSorted[i]);
}

async function runTests() {
    console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║       SMART Comprehensive Warning Label Tests                              ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const manager = createMedicationManager();

    console.log(`${colors.dim}Data: ${medications.length} medications, ${medicationWarnings.length} warnings, ${medications.reduce((s,m) => s + (m.aliases?.length || 0), 0)} aliases${colors.reset}\n`);

    const results = {
        exactFormulation: { passed: 0, failed: 0, failures: [] },
        drugNameVariations: { passed: 0, failed: 0, failures: [] },
        aliasResolution: { passed: 0, failed: 0, failures: [] },
        caseInsensitivity: { passed: 0, failed: 0, failures: [] },
        wordOrderVariations: { passed: 0, failed: 0, failures: [] },
        separatorVariations: { passed: 0, failed: 0, failures: [] },
    };

    // TEST 1: Exact formulation matching - every warning entry should work with its exact formulation
    console.log(`${colors.bold}Test 1: Exact Drug Name + Exact Formulation${colors.reset}`);
    for (const warning of medicationWarnings) {
        for (const drugName of warning.name) {
            const cleanName = drugName.replace(/-Specialist-Drug$/i, '').replace(/-/g, ' ');
            for (const form of warning.formulation) {
                const result = manager.findWarningLabels(cleanName, form);
                if (arraysEqual(result, warning.label_number)) {
                    results.exactFormulation.passed++;
                } else {
                    results.exactFormulation.failed++;
                    if (results.exactFormulation.failures.length < 20) {
                        results.exactFormulation.failures.push({ drug: cleanName, form, expected: warning.label_number, actual: result });
                    }
                }
            }
        }
    }
    const t1Total = results.exactFormulation.passed + results.exactFormulation.failed;
    console.log(`  ${results.exactFormulation.failed === 0 ? colors.green + '✓' : colors.red + '✗'}${colors.reset} ${results.exactFormulation.passed}/${t1Total} (${(results.exactFormulation.passed/t1Total*100).toFixed(1)}%)\n`);

    // TEST 2: Drug name variations (hyphen vs space, case)
    console.log(`${colors.bold}Test 2: Drug Name Variations (hyphen/space)${colors.reset}`);
    for (const warning of medicationWarnings) {
        for (const drugName of warning.name) {
            const cleanName = drugName.replace(/-Specialist-Drug$/i, '');
            const variations = [
                cleanName,
                cleanName.replace(/-/g, ' '),
                cleanName.replace(/ /g, '-'),
                cleanName.toLowerCase(),
                cleanName.toUpperCase(),
            ];
            for (const nameVar of variations) {
                for (const form of warning.formulation) {
                    const result = manager.findWarningLabels(nameVar, form);
                    if (arraysEqual(result, warning.label_number)) {
                        results.drugNameVariations.passed++;
                    } else {
                        results.drugNameVariations.failed++;
                        if (results.drugNameVariations.failures.length < 20) {
                            results.drugNameVariations.failures.push({ drug: nameVar, form, expected: warning.label_number, actual: result, original: cleanName });
                        }
                    }
                }
            }
        }
    }
    const t2Total = results.drugNameVariations.passed + results.drugNameVariations.failed;
    console.log(`  ${results.drugNameVariations.failed === 0 ? colors.green + '✓' : colors.red + '✗'}${colors.reset} ${results.drugNameVariations.passed}/${t2Total} (${(results.drugNameVariations.passed/t2Total*100).toFixed(1)}%)\n`);

    // TEST 3: Alias resolution - test that all aliases resolve to correct warnings
    console.log(`${colors.bold}Test 3: Alias Resolution${colors.reset}`);
    let aliasTestCount = 0;
    for (const med of medications) {
        // Find if this medication has any warnings
        const mainNorm = manager._cachedNormalize(med.name);
        const warnings = manager._warningIndex?.get(mainNorm);
        
        if (warnings && warnings.length > 0) {
            for (const warning of warnings) {
                for (const form of warning.formulation) {
                    // Test main name
                    const mainResult = manager.findWarningLabels(med.name, form);
                    
                    // Test each alias
                    for (const alias of (med.aliases || [])) {
                        aliasTestCount++;
                        const aliasResult = manager.findWarningLabels(alias, form);
                        
                        if (arraysEqual(aliasResult, mainResult)) {
                            results.aliasResolution.passed++;
                        } else {
                            results.aliasResolution.failed++;
                            if (results.aliasResolution.failures.length < 20) {
                                results.aliasResolution.failures.push({ 
                                    mainName: med.name, 
                                    alias, 
                                    form,
                                    mainResult, 
                                    aliasResult 
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    const t3Total = results.aliasResolution.passed + results.aliasResolution.failed;
    if (t3Total > 0) {
        console.log(`  ${results.aliasResolution.failed === 0 ? colors.green + '✓' : colors.red + '✗'}${colors.reset} ${results.aliasResolution.passed}/${t3Total} (${(results.aliasResolution.passed/t3Total*100).toFixed(1)}%)\n`);
    } else {
        console.log(`  ${colors.dim}No alias tests applicable${colors.reset}\n`);
    }

    // TEST 4: Case insensitivity
    console.log(`${colors.bold}Test 4: Case Insensitivity${colors.reset}`);
    const sampleWarnings = medicationWarnings.slice(0, 200); // Sample for performance
    for (const warning of sampleWarnings) {
        for (const drugName of warning.name) {
            const cleanName = drugName.replace(/-Specialist-Drug$/i, '').replace(/-/g, ' ');
            const caseVariations = [cleanName, cleanName.toLowerCase(), cleanName.toUpperCase(), cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase()];
            
            for (const form of warning.formulation) {
                const formVariations = [form, form.toLowerCase(), form.toUpperCase()];
                
                for (const nameVar of caseVariations) {
                    for (const formVar of formVariations) {
                        const result = manager.findWarningLabels(nameVar, formVar);
                        if (arraysEqual(result, warning.label_number)) {
                            results.caseInsensitivity.passed++;
                        } else {
                            results.caseInsensitivity.failed++;
                            if (results.caseInsensitivity.failures.length < 10) {
                                results.caseInsensitivity.failures.push({ drug: nameVar, form: formVar, expected: warning.label_number, actual: result });
                            }
                        }
                    }
                }
            }
        }
    }
    const t4Total = results.caseInsensitivity.passed + results.caseInsensitivity.failed;
    console.log(`  ${results.caseInsensitivity.failed === 0 ? colors.green + '✓' : colors.red + '✗'}${colors.reset} ${results.caseInsensitivity.passed}/${t4Total} (${(results.caseInsensitivity.passed/t4Total*100).toFixed(1)}%)\n`);

    // TEST 5: Word order variations for 2-word drug names
    console.log(`${colors.bold}Test 5: Word Order Variations (2-word names)${colors.reset}`);
    for (const warning of medicationWarnings) {
        for (const drugName of warning.name) {
            const cleanName = drugName.replace(/-Specialist-Drug$/i, '').replace(/-/g, ' ');
            const words = cleanName.split(' ').filter(w => w);
            
            if (words.length === 2) {
                const reversed = words[1] + ' ' + words[0];
                
                for (const form of warning.formulation) {
                    const originalResult = manager.findWarningLabels(cleanName, form);
                    const reversedResult = manager.findWarningLabels(reversed, form);
                    
                    if (arraysEqual(originalResult, reversedResult) && arraysEqual(originalResult, warning.label_number)) {
                        results.wordOrderVariations.passed++;
                    } else {
                        results.wordOrderVariations.failed++;
                        if (results.wordOrderVariations.failures.length < 20) {
                            results.wordOrderVariations.failures.push({ original: cleanName, reversed, form, expected: warning.label_number, originalResult, reversedResult });
                        }
                    }
                }
            }
        }
    }
    const t5Total = results.wordOrderVariations.passed + results.wordOrderVariations.failed;
    if (t5Total > 0) {
        console.log(`  ${results.wordOrderVariations.failed === 0 ? colors.green + '✓' : colors.yellow + '~'}${colors.reset} ${results.wordOrderVariations.passed}/${t5Total} (${(results.wordOrderVariations.passed/t5Total*100).toFixed(1)}%)\n`);
    } else {
        console.log(`  ${colors.dim}No 2-word names to test${colors.reset}\n`);
    }

    // TEST 6: Separator variations for combination drugs
    console.log(`${colors.bold}Test 6: Combination Drug Separators (with/and/-//)${colors.reset}`);
    const combinationDrugs = medicationWarnings.filter(w => w.name.some(n => n.includes('-With-') || n.includes('-And-')));
    
    for (const warning of combinationDrugs) {
        for (const drugName of warning.name) {
            if (drugName.includes('-With-') || drugName.includes('-And-')) {
                const cleanName = drugName.replace(/-Specialist-Drug$/i, '');
                const baseName = cleanName.replace(/-/g, ' ');
                
                // Generate variations
                const variations = [
                    baseName,
                    baseName.replace(/ with /gi, '/'),
                    baseName.replace(/ with /gi, '-'),
                    baseName.replace(/ with /gi, ' and '),
                    baseName.replace(/ and /gi, '/'),
                    baseName.replace(/ and /gi, ' with '),
                ];
                
                for (const form of warning.formulation) {
                    for (const nameVar of variations) {
                        const result = manager.findWarningLabels(nameVar, form);
                        if (arraysEqual(result, warning.label_number)) {
                            results.separatorVariations.passed++;
                        } else {
                            results.separatorVariations.failed++;
                            if (results.separatorVariations.failures.length < 20) {
                                results.separatorVariations.failures.push({ drug: nameVar, form, expected: warning.label_number, actual: result, original: cleanName });
                            }
                        }
                    }
                }
            }
        }
    }
    const t6Total = results.separatorVariations.passed + results.separatorVariations.failed;
    if (t6Total > 0) {
        console.log(`  ${results.separatorVariations.failed === 0 ? colors.green + '✓' : colors.yellow + '~'}${colors.reset} ${results.separatorVariations.passed}/${t6Total} (${(results.separatorVariations.passed/t6Total*100).toFixed(1)}%)\n`);
    } else {
        console.log(`  ${colors.dim}No combination drugs to test${colors.reset}\n`);
    }

    // SUMMARY
    console.log(`${colors.bold}════════════════════════════════════════════════════════════════════════════${colors.reset}`);
    
    const totalPassed = Object.values(results).reduce((s, r) => s + r.passed, 0);
    const totalFailed = Object.values(results).reduce((s, r) => s + r.failed, 0);
    const totalTests = totalPassed + totalFailed;
    const passRate = (totalPassed / totalTests * 100).toFixed(2);

    console.log(`${colors.bold}SUMMARY:${colors.reset}`);
    console.log(`  Total tests: ${totalTests.toLocaleString()}`);
    console.log(`  Passed: ${colors.green}${totalPassed.toLocaleString()}${colors.reset}`);
    console.log(`  Failed: ${colors.red}${totalFailed.toLocaleString()}${colors.reset}`);
    console.log(`  Pass rate: ${passRate}%`);
    
    console.log(`${colors.bold}════════════════════════════════════════════════════════════════════════════${colors.reset}`);

    // Show failures
    const allFailures = [];
    for (const [testName, result] of Object.entries(results)) {
        if (result.failures.length > 0) {
            allFailures.push({ testName, failures: result.failures });
        }
    }

    if (allFailures.length > 0) {
        console.log(`\n${colors.bold}Sample Failures:${colors.reset}\n`);
        
        for (const { testName, failures } of allFailures) {
            console.log(`${colors.yellow}${testName}:${colors.reset}`);
            for (const f of failures.slice(0, 5)) {
                if (f.alias) {
                    console.log(`  ${colors.red}✗${colors.reset} Main: "${f.mainName}" → [${f.mainResult.join(',')}]`);
                    console.log(`    Alias: "${f.alias}" → [${f.aliasResult.join(',')}] (${f.form})`);
                } else if (f.reversed) {
                    console.log(`  ${colors.red}✗${colors.reset} "${f.original}" vs "${f.reversed}" (${f.form})`);
                    console.log(`    Original: [${f.originalResult.join(',')}] | Reversed: [${f.reversedResult.join(',')}] | Expected: [${f.expected.join(',')}]`);
                } else {
                    console.log(`  ${colors.red}✗${colors.reset} "${f.drug}" + "${f.form}"`);
                    console.log(`    Expected: [${f.expected.join(',')}] | Got: [${f.actual.join(',')}]`);
                }
            }
            console.log('');
        }
    }

    process.exit(totalFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error(`${colors.red}Error:${colors.reset}`, err);
    process.exit(1);
});
