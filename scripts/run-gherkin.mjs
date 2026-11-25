import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildHtmlReport, buildJUnitXml, runFeatures } from './gherkin-engine.mjs';

const rootDir = process.cwd();
const featuresDir = path.join(rootDir, 'features');
const stepsDir = path.join(featuresDir, 'step_definitions');
const reportsDir = path.join(rootDir, 'reports');

mkdirSync(reportsDir, { recursive: true });

const stepFiles = readdirSync(stepsDir)
  .filter(name => name.endsWith('.steps.mjs'))
  .sort()
  .map(name => path.join(stepsDir, name));

for (const stepFile of stepFiles) {
  await import(pathToFileURL(stepFile).href);
}

const featureFiles = readdirSync(featuresDir)
  .filter(name => name.endsWith('.feature'))
  .sort()
  .map(name => path.join(featuresDir, name));

if (featureFiles.length === 0) {
  console.error('No se encontraron archivos .feature en features/.');
  process.exit(1);
}

const { cucumberReport, summary } = await runFeatures(featureFiles, rootDir);

for (const feature of cucumberReport) {
  console.log(`\n${feature.keyword}: ${feature.name} (${feature.uri})`);
  for (const scenario of feature.elements) {
    const passed = scenario.steps.every(s => s.result.status === 'passed');
    const icon = passed ? '✔' : '✖';
    const ms = (scenario.steps.reduce((acc, s) => acc + (s.result.duration || 0), 0) / 1e6).toFixed(2);
    console.log(`  ${icon} ${scenario.name} (${ms} ms)`);
    for (const step of scenario.steps) {
      if (step.result.status !== 'passed') {
        console.log(`      ✖ ${step.keyword}${step.name} [${step.result.status}]`);
        if (step.result.error_message) {
          console.log(`        ${step.result.error_message}`);
        }
      }
    }
  }
}

const jsonPath = path.join(reportsDir, 'cucumber-report.json');
const junitPath = path.join(reportsDir, 'gherkin-junit.xml');
const htmlPath = path.join(reportsDir, 'cucumber-report.html');

writeFileSync(jsonPath, `${JSON.stringify(cucumberReport, null, 2)}\n`, 'utf8');
writeFileSync(junitPath, buildJUnitXml(cucumberReport), 'utf8');
writeFileSync(htmlPath, buildHtmlReport(cucumberReport, summary), 'utf8');

console.log('\n--- Resumen Gherkin (BDD) ---');
console.log(`Características: ${summary.features}`);
console.log(`Escenarios: ${summary.scenarios} (aprobados: ${summary.passedScenarios}, fallidos: ${summary.failedScenarios})`);
console.log(`Pasos: ${summary.steps} (aprobados: ${summary.passedSteps}, fallidos: ${summary.failedSteps}, omitidos: ${summary.skippedSteps}, sin definir: ${summary.undefinedSteps})`);
console.log(`Duración: ${summary.durationMs.toFixed(2)} ms`);
console.log(`Reportes generados:`);
console.log(`  - reports/cucumber-report.json`);
console.log(`  - reports/gherkin-junit.xml`);
console.log(`  - reports/cucumber-report.html`);

if (summary.failedScenarios > 0) {
  process.exitCode = 1;
}
