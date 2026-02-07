const fs = require("fs");
const lcov = fs.readFileSync("coverage/lcov.info", "utf8");
const files = [];
let current = null;

for (const line of lcov.split("\n")) {
  if (line.startsWith("SF:")) {
    current = { path: line.slice(3), uncovered: 0, total: 0 };
  } else if (line.startsWith("DA:") && current) {
    current.total++;
    if (line.endsWith(",0")) current.uncovered++;
  } else if (line === "end_of_record" && current) {
    files.push(current);
    current = null;
  }
}

// Check path format
console.log(
  "Sample paths:",
  files.slice(0, 3).map((f) => f.path),
);

const testable = files.filter(
  (f) =>
    f.uncovered >= 15 &&
    (f.path.includes("utils") || f.path.includes("services")),
);
testable.sort((a, b) => b.uncovered - a.uncovered);

console.log("Top testable service/util files with coverage gaps:");
testable.slice(0, 15).forEach((f) => {
  const pct = (((f.total - f.uncovered) / f.total) * 100).toFixed(0);
  console.log("  " + f.uncovered + " uncov (" + pct + "%): " + f.path);
});
