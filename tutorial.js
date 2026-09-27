// Generic dismissible step-by-step tutorial overlay. Call createTutorial with
// a unique key (used to remember it's been seen) and an array of
// { title, text } steps. Shows once per browser, never again after
// finishing or skipping.
function createTutorial(key, steps) {
  const seenKey = `tutorialSeen:${key}`;
  if (localStorage.getItem(seenKey)) return;

  let stepIndex = 0;

  const overlay = document.createElement("div");
  overlay.className = "tutorial-overlay";
  overlay.innerHTML = `
    <div class="tutorial-box">
      <p class="tutorial-step-count" id="tutorialStepCount"></p>
      <h3 class="tutorial-title" id="tutorialTitle"></h3>
      <p class="tutorial-text" id="tutorialText"></p>
      <div class="tutorial-actions">
        <button class="tutorial-skip" id="tutorialSkip">skip</button>
        <button class="btn tutorial-next" id="tutorialNext">next</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const titleEl = overlay.querySelector("#tutorialTitle");
  const textEl = overlay.querySelector("#tutorialText");
  const countEl = overlay.querySelector("#tutorialStepCount");
  const nextBtn = overlay.querySelector("#tutorialNext");
  const skipBtn = overlay.querySelector("#tutorialSkip");

  function renderStep() {
    const step = steps[stepIndex];
    countEl.textContent = `step ${stepIndex + 1} / ${steps.length}`;
    titleEl.textContent = step.title;
    textEl.textContent = step.text;
    nextBtn.textContent = stepIndex === steps.length - 1 ? "let's go!" : "next";
  }

  function finish() {
    localStorage.setItem(seenKey, "1");
    overlay.remove();
  }

  nextBtn.addEventListener("click", () => {
    stepIndex += 1;
    if (stepIndex >= steps.length) finish();
    else renderStep();
  });
  skipBtn.addEventListener("click", finish);

  renderStep();
}
