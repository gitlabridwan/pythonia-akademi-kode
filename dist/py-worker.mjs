import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs";

let pyodide;

function serialise(value) {
  if (value && typeof value.toJs === "function") {
    const converted = value.toJs({ dict_converter: Object.fromEntries });
    value.destroy?.();
    return converted;
  }
  return value;
}

async function initialise() {
  try {
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/"
    });
    self.postMessage({ type: "ready" });
  } catch (error) {
    self.postMessage({ type: "boot-error", error: String(error?.message || error) });
  }
}

initialise();

self.onmessage = async (event) => {
  const { id, code, checks = [], outputExpected } = event.data;
  if (!pyodide) {
    self.postMessage({ id, ok: false, error: "Mesin Python belum siap." });
    return;
  }

  const output = [];
  const errors = [];
  const globals = pyodide.globals.get("dict")();
  pyodide.setStdout({ batched: (text) => output.push(text) });
  pyodide.setStderr({ batched: (text) => errors.push(text) });

  try {
    await pyodide.runPythonAsync(code, { globals });
    const results = [];
    for (const check of checks) {
      let actual;
      try {
        actual = serialise(await pyodide.runPythonAsync(check.expression, { globals }));
        const passed = JSON.stringify(actual) === JSON.stringify(check.expected);
        results.push({ label: check.label, passed, actual, expected: check.expected });
      } catch (error) {
        results.push({ label: check.label, passed: false, actual: String(error?.message || error), expected: check.expected });
      }
    }

    const cleanOutput = output.join("\n").trim();
    const outputPassed = outputExpected === undefined || cleanOutput === outputExpected;
    self.postMessage({
      id,
      ok: results.every((result) => result.passed) && outputPassed,
      output: cleanOutput,
      stderr: errors.join("\n").trim(),
      checks: results,
      outputCheck: outputExpected === undefined ? null : { passed: outputPassed, expected: outputExpected, actual: cleanOutput }
    });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      output: output.join("\n").trim(),
      stderr: errors.join("\n").trim(),
      error: String(error?.message || error)
    });
  } finally {
    globals.destroy?.();
  }
};
