import { readFileSync } from 'node:fs';
import path from 'node:path';

const stepRegistry = [];
const beforeHooks = [];
const afterHooks = [];

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePattern(pattern) {
  if (pattern instanceof RegExp) {
    return { regex: pattern, types: [] };
  }
  const types = [];
  let source = escapeRegex(pattern);
  source = source.replace(/\\\{(string|int|float)\\\}/g, (_, type) => {
    types.push(type);
    if (type === 'string') return '"([^"]*)"';
    if (type === 'int') return '(-?\\d+)';
    if (type === 'float') return '(-?\\d+(?:\\.\\d+)?)';
    return '(.+)';
  });
  return { regex: new RegExp(`^${source}$`), types };
}

function registerStep(keyword, pattern, fn) {
  const { regex, types } = compilePattern(pattern);
  stepRegistry.push({ keyword, pattern: String(pattern), regex, types, fn });
}

export const Given = (pattern, fn) => registerStep('Given', pattern, fn);
export const When = (pattern, fn) => registerStep('When', pattern, fn);
export const Then = (pattern, fn) => registerStep('Then', pattern, fn);
export const Dado = Given;
export const Cuando = When;
export const Entonces = Then;
export const Before = (fn) => beforeHooks.push(fn);
export const After = (fn) => afterHooks.push(fn);

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseTableRow(line) {
  const trimmed = line.trim();
  const inner = trimmed.slice(1, -1);
  return inner.split('|').map(cell => cell.trim());
}

const STEP_REGEX = /^(Dada|Dados|Dadas|Dado|Cuando|Entonces|Pero|Y|Given|When|Then|And|But)\s+(.+)$/;

export function parseFeatureFile(filePath, rootDir = process.cwd()) {
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const uri = path.relative(rootDir, filePath).split(path.sep).join('/');

  const feature = {
    uri,
    keyword: 'Característica',
    name: '',
    description: '',
    line: 1,
    tags: [],
    background: null,
    scenarios: [],
  };

  let pendingTags = [];
  let currentBlock = null;
  let inExamples = false;
  let exampleHeaders = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNum = idx + 1;
    const trimmed = lines[idx].trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    if (trimmed.startsWith('@')) {
      const tags = trimmed.split(/\s+/).filter(t => t.startsWith('@')).map(name => ({ name, line: lineNum }));
      pendingTags.push(...tags);
      continue;
    }

    const featureMatch = trimmed.match(/^(Característica|Feature):\s*(.*)$/);
    if (featureMatch) {
      feature.keyword = featureMatch[1];
      feature.name = featureMatch[2].trim();
      feature.line = lineNum;
      feature.tags = pendingTags;
      pendingTags = [];
      currentBlock = { type: 'feature' };
      inExamples = false;
      continue;
    }

    const bgMatch = trimmed.match(/^(Antecedentes|Background):\s*(.*)$/);
    if (bgMatch) {
      feature.background = {
        keyword: bgMatch[1],
        name: bgMatch[2].trim(),
        line: lineNum,
        steps: [],
      };
      currentBlock = { type: 'background', target: feature.background };
      inExamples = false;
      pendingTags = [];
      continue;
    }

    const outlineMatch = trimmed.match(/^(Esquema del escenario|Scenario Outline|Scenario Template):\s*(.*)$/);
    if (outlineMatch) {
      const scenario = {
        keyword: outlineMatch[1],
        name: outlineMatch[2].trim(),
        line: lineNum,
        tags: [...feature.tags, ...pendingTags],
        isOutline: true,
        steps: [],
        examples: [],
      };
      feature.scenarios.push(scenario);
      currentBlock = { type: 'scenario', target: scenario };
      pendingTags = [];
      inExamples = false;
      exampleHeaders = null;
      continue;
    }

    const scenarioMatch = trimmed.match(/^(Escenario|Ejemplo|Scenario|Example):\s*(.*)$/);
    if (scenarioMatch) {
      const scenario = {
        keyword: scenarioMatch[1],
        name: scenarioMatch[2].trim(),
        line: lineNum,
        tags: [...feature.tags, ...pendingTags],
        isOutline: false,
        steps: [],
        examples: [],
      };
      feature.scenarios.push(scenario);
      currentBlock = { type: 'scenario', target: scenario };
      pendingTags = [];
      inExamples = false;
      exampleHeaders = null;
      continue;
    }

    const examplesMatch = trimmed.match(/^(Ejemplos|Examples):\s*(.*)$/);
    if (examplesMatch && currentBlock?.type === 'scenario') {
      inExamples = true;
      exampleHeaders = null;
      continue;
    }

    if (inExamples && trimmed.startsWith('|') && trimmed.endsWith('|') && currentBlock?.type === 'scenario') {
      const cells = parseTableRow(trimmed);
      if (!exampleHeaders) {
        exampleHeaders = cells;
      } else {
        const rowObj = {};
        exampleHeaders.forEach((h, i) => {
          rowObj[h] = cells[i] ?? '';
        });
        currentBlock.target.examples.push({ line: lineNum, values: rowObj });
      }
      continue;
    }

    const stepMatch = trimmed.match(STEP_REGEX);
    if (stepMatch && (currentBlock?.type === 'scenario' || currentBlock?.type === 'background')) {
      currentBlock.target.steps.push({
        keyword: `${stepMatch[1]} `,
        text: stepMatch[2].trim(),
        line: lineNum,
      });
      continue;
    }

    if (currentBlock?.type === 'feature') {
      feature.description = feature.description
        ? `${feature.description}\n${trimmed}`
        : trimmed;
    }
  }

  return feature;
}

function expandScenarios(feature) {
  const expanded = [];
  for (const sc of feature.scenarios) {
    if (!sc.isOutline) {
      expanded.push({
        name: sc.name,
        keyword: sc.keyword,
        line: sc.line,
        tags: sc.tags,
        steps: [
          ...(feature.background ? feature.background.steps : []),
          ...sc.steps,
        ],
      });
      continue;
    }
    sc.examples.forEach((example, idx) => {
      const replaceVars = (str) =>
        str.replace(/<([^>]+)>/g, (_, key) =>
          Object.prototype.hasOwnProperty.call(example.values, key) ? example.values[key] : `<${key}>`
        );
      const summary = Object.values(example.values).join(' | ');
      expanded.push({
        name: `${sc.name} (Ejemplo #${idx + 1}: ${summary})`,
        keyword: sc.keyword,
        line: example.line,
        tags: sc.tags,
        steps: [
          ...(feature.background ? feature.background.steps : []),
          ...sc.steps.map(s => ({ ...s, text: replaceVars(s.text) })),
        ],
      });
    });
  }
  return expanded;
}

function matchStep(text) {
  for (const def of stepRegistry) {
    const match = text.match(def.regex);
    if (match) {
      const args = match.slice(1).map((val, i) => {
        const type = def.types[i];
        if (type === 'int') return Number.parseInt(val, 10);
        if (type === 'float') return Number.parseFloat(val);
        return val;
      });
      return { def, args };
    }
  }
  return null;
}

export async function runFeatures(featureFiles, rootDir = process.cwd()) {
  const cucumberReport = [];
  const summary = {
    features: 0,
    scenarios: 0,
    passedScenarios: 0,
    failedScenarios: 0,
    steps: 0,
    passedSteps: 0,
    failedSteps: 0,
    skippedSteps: 0,
    undefinedSteps: 0,
    durationMs: 0,
  };

  const suiteStart = process.hrtime.bigint();

  for (const filePath of featureFiles) {
    const feature = parseFeatureFile(filePath, rootDir);
    const featureId = slugify(feature.name || feature.uri);
    const scenarios = expandScenarios(feature);
    const elements = [];

    summary.features += 1;

    for (const sc of scenarios) {
      summary.scenarios += 1;
      const world = {};
      const stepResults = [];
      let scenarioFailed = false;
      let scenarioError = null;

      for (const hook of beforeHooks) {
        await hook(world);
      }

      for (const step of sc.steps) {
        summary.steps += 1;
        if (scenarioFailed) {
          summary.skippedSteps += 1;
          stepResults.push({
            keyword: step.keyword,
            name: step.text,
            line: step.line,
            match: { location: feature.uri },
            result: { status: 'skipped', duration: 0 },
          });
          continue;
        }

        const matched = matchStep(step.text);
        if (!matched) {
          scenarioFailed = true;
          scenarioError = new Error(`Paso no definido: ${step.keyword}${step.text}`);
          summary.undefinedSteps += 1;
          stepResults.push({
            keyword: step.keyword,
            name: step.text,
            line: step.line,
            result: {
              status: 'undefined',
              duration: 0,
              error_message: scenarioError.message,
            },
          });
          continue;
        }

        const stepStart = process.hrtime.bigint();
        try {
          await matched.def.fn.call(world, world, ...matched.args);
          const durationNs = Number(process.hrtime.bigint() - stepStart);
          summary.passedSteps += 1;
          stepResults.push({
            keyword: step.keyword,
            name: step.text,
            line: step.line,
            match: { location: matched.def.pattern },
            result: { status: 'passed', duration: durationNs },
          });
        } catch (err) {
          const durationNs = Number(process.hrtime.bigint() - stepStart);
          scenarioFailed = true;
          scenarioError = err;
          summary.failedSteps += 1;
          stepResults.push({
            keyword: step.keyword,
            name: step.text,
            line: step.line,
            match: { location: matched.def.pattern },
            result: {
              status: 'failed',
              duration: durationNs,
              error_message: err?.stack || err?.message || String(err),
            },
          });
        }
      }

      for (const hook of afterHooks) {
        await hook(world);
      }

      if (scenarioFailed) {
        summary.failedScenarios += 1;
      } else {
        summary.passedScenarios += 1;
      }

      elements.push({
        id: `${featureId};${slugify(sc.name)}`,
        keyword: sc.keyword,
        name: sc.name,
        description: '',
        line: sc.line,
        type: 'scenario',
        tags: sc.tags,
        steps: stepResults,
      });
    }

    cucumberReport.push({
      id: featureId,
      uri: feature.uri,
      keyword: feature.keyword,
      name: feature.name,
      description: feature.description,
      line: feature.line,
      tags: feature.tags,
      elements,
    });
  }

  summary.durationMs = Number(process.hrtime.bigint() - suiteStart) / 1e6;
  return { cucumberReport, summary };
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildJUnitXml(cucumberReport) {
  const totalTests = cucumberReport.reduce((acc, f) => acc + f.elements.length, 0);
  const totalFailures = cucumberReport.reduce(
    (acc, f) => acc + f.elements.filter(e => e.steps.some(s => s.result.status !== 'passed')).length,
    0
  );
  const totalTimeSec = cucumberReport.reduce(
    (acc, f) =>
      acc +
      f.elements.reduce(
        (sAcc, e) => sAcc + e.steps.reduce((stAcc, s) => stAcc + (s.result.duration || 0), 0),
        0
      ),
    0
  ) / 1e9;

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="Gherkin BDD - IA con Criterio" tests="${totalTests}" failures="${totalFailures}" time="${totalTimeSec.toFixed(6)}">`,
  ];

  for (const feature of cucumberReport) {
    const fTests = feature.elements.length;
    const fFailures = feature.elements.filter(e => e.steps.some(s => s.result.status !== 'passed')).length;
    const fTime = feature.elements.reduce(
      (sAcc, e) => sAcc + e.steps.reduce((stAcc, s) => stAcc + (s.result.duration || 0), 0),
      0
    ) / 1e9;

    lines.push(
      `  <testsuite name="${escapeXml(feature.name)}" tests="${fTests}" failures="${fFailures}" time="${fTime.toFixed(6)}" file="${escapeXml(feature.uri)}">`
    );

    for (const scenario of feature.elements) {
      const sTime = scenario.steps.reduce((acc, s) => acc + (s.result.duration || 0), 0) / 1e9;
      const failedStep = scenario.steps.find(s => s.result.status === 'failed' || s.result.status === 'undefined');
      if (!failedStep) {
        lines.push(
          `    <testcase classname="${escapeXml(feature.name)}" name="${escapeXml(scenario.name)}" time="${sTime.toFixed(6)}"/>`
        );
      } else {
        const msg = failedStep.result.error_message || `Fallo en paso: ${failedStep.keyword}${failedStep.name}`;
        lines.push(
          `    <testcase classname="${escapeXml(feature.name)}" name="${escapeXml(scenario.name)}" time="${sTime.toFixed(6)}">`
        );
        lines.push(
          `      <failure message="${escapeXml(`${failedStep.keyword}${failedStep.name}`)}">${escapeXml(msg)}</failure>`
        );
        lines.push('    </testcase>');
      }
    }

    lines.push('  </testsuite>');
  }

  lines.push('</testsuites>');
  return `${lines.join('\n')}\n`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildHtmlReport(cucumberReport, summary) {
  const generatedAt = new Date().toISOString();
  const featureBlocks = cucumberReport
    .map(feature => {
      const tagsHtml = (feature.tags || [])
        .map(t => `<span class="tag">${escapeHtml(t.name)}</span>`)
        .join(' ');
      const scenariosHtml = feature.elements
        .map(sc => {
          const isPass = sc.steps.every(s => s.result.status === 'passed');
          const scMs = (sc.steps.reduce((a, s) => a + (s.result.duration || 0), 0) / 1e6).toFixed(2);
          const stepsHtml = sc.steps
            .map(st => {
              const status = st.result.status;
              const stMs = ((st.result.duration || 0) / 1e6).toFixed(2);
              const errHtml = st.result.error_message
                ? `<pre class="error-box">${escapeHtml(st.result.error_message)}</pre>`
                : '';
              return `<li class="step step-${status}">
                <span class="badge badge-${status}">${status.toUpperCase()}</span>
                <span class="kw">${escapeHtml(st.keyword)}</span>
                <span class="step-text">${escapeHtml(st.name)}</span>
                <span class="time">${stMs} ms</span>
                ${errHtml}
              </li>`;
            })
            .join('\n');

          return `<details class="scenario ${isPass ? 'pass' : 'fail'}" ${isPass ? '' : 'open'}>
            <summary>
              <span class="badge ${isPass ? 'badge-passed' : 'badge-failed'}">${isPass ? 'PASS' : 'FAIL'}</span>
              <span class="sc-title"><strong>${escapeHtml(sc.keyword)}:</strong> ${escapeHtml(sc.name)}</span>
              <span class="time">${scMs} ms</span>
            </summary>
            <ul class="steps">${stepsHtml}</ul>
          </details>`;
        })
        .join('\n');

      return `<section class="feature-card">
        <div class="feature-head">
          <div>
            <div class="tags">${tagsHtml}</div>
            <h2>${escapeHtml(feature.keyword)}: ${escapeHtml(feature.name)}</h2>
            <p class="uri">${escapeHtml(feature.uri)}</p>
          </div>
        </div>
        ${feature.description ? `<p class="desc">${escapeHtml(feature.description).replace(/\n/g, '<br>')}</p>` : ''}
        <div class="scenarios">${scenariosHtml}</div>
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte Gherkin (BDD) - IA con Criterio</title>
  <style>
    :root { --bg:#f8fafc; --card:#ffffff; --ink:#0f172a; --muted:#475569; --border:#e2e8f0; --pass:#15803d; --pass-bg:#dcfce7; --fail:#b91c1c; --fail-bg:#fee2e2; --skip:#a16207; --skip-bg:#fef9c3; --accent:#1d4ed8; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:var(--bg); color:var(--ink); line-height:1.5; }
    header { background:#0f172a; color:#fff; padding:24px 32px; }
    header h1 { margin:0 0 6px; font-size:1.5rem; }
    header p { margin:0; color:#cbd5e1; font-size:0.9rem; }
    main { max-width:1080px; margin:24px auto; padding:0 20px 40px; }
    .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:24px; }
    .kpi { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:14px 16px; }
    .kpi .label { font-size:0.8rem; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
    .kpi .value { font-size:1.6rem; font-weight:700; margin-top:4px; }
    .kpi.pass .value { color:var(--pass); }
    .kpi.fail .value { color:var(--fail); }
    .feature-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:18px; }
    .feature-card h2 { margin:6px 0 4px; font-size:1.15rem; }
    .uri { margin:0; font-size:0.82rem; color:var(--muted); font-family:ui-monospace,Consolas,monospace; }
    .desc { color:var(--muted); font-size:0.92rem; margin:10px 0 14px; padding-left:12px; border-left:3px solid var(--border); }
    .tag { display:inline-block; background:#eff6ff; color:var(--accent); font-size:0.75rem; font-weight:600; padding:2px 8px; border-radius:999px; margin-right:4px; }
    details.scenario { border:1px solid var(--border); border-radius:8px; margin-top:10px; overflow:hidden; }
    details.scenario summary { cursor:pointer; padding:10px 14px; display:flex; align-items:center; gap:10px; background:#f8fafc; list-style:none; }
    details.scenario summary::-webkit-details-marker { display:none; }
    .sc-title { flex:1; font-size:0.95rem; }
    .steps { list-style:none; margin:0; padding:10px 14px; border-top:1px solid var(--border); }
    .step { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:6px 0; border-bottom:1px dashed var(--border); font-size:0.9rem; }
    .step:last-child { border-bottom:none; }
    .kw { font-weight:700; color:var(--accent); }
    .step-text { flex:1; }
    .time { font-size:0.78rem; color:var(--muted); font-family:ui-monospace,Consolas,monospace; }
    .badge { font-size:0.7rem; font-weight:700; padding:2px 7px; border-radius:5px; }
    .badge-passed { background:var(--pass-bg); color:var(--pass); }
    .badge-failed, .badge-undefined { background:var(--fail-bg); color:var(--fail); }
    .badge-skipped { background:var(--skip-bg); color:var(--skip); }
    .error-box { width:100%; background:#fef2f2; color:#991b1b; padding:10px; border-radius:6px; overflow:auto; font-size:0.8rem; margin:6px 0 0; }
  </style>
</head>
<body>
  <header>
    <h1>Reporte de Pruebas Gherkin (BDD) — IA con Criterio</h1>
    <p>Generado el ${escapeHtml(generatedAt)} · Duración total: ${summary.durationMs.toFixed(2)} ms</p>
  </header>
  <main>
    <section class="kpis">
      <div class="kpi"><div class="label">Características</div><div class="value">${summary.features}</div></div>
      <div class="kpi"><div class="label">Escenarios</div><div class="value">${summary.scenarios}</div></div>
      <div class="kpi pass"><div class="label">Aprobados</div><div class="value">${summary.passedScenarios}</div></div>
      <div class="kpi ${summary.failedScenarios > 0 ? 'fail' : ''}"><div class="label">Fallidos</div><div class="value">${summary.failedScenarios}</div></div>
      <div class="kpi"><div class="label">Pasos ejecutados</div><div class="value">${summary.steps}</div></div>
    </section>
    ${featureBlocks}
  </main>
</body>
</html>
`;
}
