export function meanValidResponses(trials) {
  const values = trials.filter((trial) => trial.valid && Number.isFinite(trial.responseMs) && trial.responseMs >= 0).map((trial) => trial.responseMs);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function presentOnFrame(runtime, render, callback) {
  return runtime.frame((timestamp) => {
    render();
    callback(timestamp);
  });
}
