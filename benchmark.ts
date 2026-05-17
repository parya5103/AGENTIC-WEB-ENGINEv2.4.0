const iterations = 10000;

// Create a large string without the HTML tag
const noHtmlError = "A".repeat(500000);
// Create a large string with the HTML tag at the beginning
const startHtmlError = "<!DOCTYPE html>" + "A".repeat(500000);

function originalCheck(errorMessage: any) {
  if (errorMessage?.includes("<!DOCTYPE html>")) {
    errorMessage = "Provider returned HTML instead of JSON (Possible API misconfiguration or outage).";
  }
  if (errorMessage?.length > 200) {
    errorMessage = errorMessage.substring(0, 197) + "...";
  }
  return errorMessage;
}

function optimizedCheck(errorMessage: any) {
  if (errorMessage?.length > 200) {
    errorMessage = errorMessage.substring(0, 197) + "...";
  }
  if (errorMessage?.includes("<!DOCTYPE html>")) {
    errorMessage = "Provider returned HTML instead of JSON (Possible API misconfiguration or outage).";
  }
  return errorMessage;
}

const startOriginal = performance.now();
for(let i=0; i<iterations; i++) {
    originalCheck(noHtmlError);
    originalCheck(startHtmlError);
}
const endOriginal = performance.now();

const startOptimized = performance.now();
for(let i=0; i<iterations; i++) {
    optimizedCheck(noHtmlError);
    optimizedCheck(startHtmlError);
}
const endOptimized = performance.now();

console.log(`Original: ${(endOriginal - startOriginal).toFixed(2)} ms`);
console.log(`Optimized: ${(endOptimized - startOptimized).toFixed(2)} ms`);
