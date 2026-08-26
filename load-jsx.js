/* Fetches app.jsx and main.jsx, compiles each with Babel (classic JSX
   runtime — plain React.createElement calls, no ES import needed), then
   runs them in order as classic scripts. Keeps this a build-step-free,
   static site while still using .jsx files directly. */
(async function () {
  async function runBabelFile(path) {
    // Always fetch the real latest file — never a cached copy. Without
    // this, a phone/browser can keep running yesterday's app.jsx for a
    // long time after a fix is actually live.
    const res = await fetch(path + "?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load " + path);
    const source = await res.text();
    const { code } = Babel.transform(source, {
      filename: path,
      presets: [["react", { runtime: "classic" }]],
    });
    const script = document.createElement("script");
    script.text = code;
    document.body.appendChild(script);
  }

  try {
    await runBabelFile("app.jsx");
    await runBabelFile("main.jsx");
  } catch (e) {
    console.error(e);
    document.getElementById("root").innerHTML =
      '<div style="padding:40px;font-family:sans-serif;color:#c0392b;">Failed to load the app: ' +
      String(e.message || e) +
      "</div>";
  }
})();
