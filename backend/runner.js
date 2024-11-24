const { exec } = require('child_process');
const path = require('path');

// List of scripts to run in order (update with your actual script file names)
const scripts = [
  path.join(__dirname, 'trader.js'),
  path.join(__dirname, 'retrader.js'),
  path.join(__dirname, 'closer.js'),
  // Add more scripts here as needed
];

// Helper function to execute a single script
const runScript = (script) => {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Starting Script: ${script} ===`);
    const process = exec(`node ${script}`);

    // Capture stdout
    process.stdout.on('data', (data) => {
      console.log(`[${script}]: ${data}`);
    });

    // Capture stderr
    process.stderr.on('data', (data) => {
      console.error(`[${script} ERROR]: ${data}`);
    });

    // Handle script completion
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`\n=== Script Completed Successfully: ${script} ===`);
        resolve();
      } else {
        console.error(`\n=== Script Failed with Code ${code}: ${script} ===`);
        reject(new Error(`Script failed: ${script}`));
      }
    });
  });
};

(async () => {
  while (true) {
    try {
      console.log('\n=== Starting New Cycle of Scripts ===');
      for (const script of scripts) {
        await runScript(script);
      }
      console.log('\n=== All Scripts Executed Successfully, Waiting for Next Cycle ===');
    } catch (error) {
      console.error(`\n=== Error During Execution: ${error.message} ===`);
    }
    console.log('\n=== Waiting 10 seconds before restarting scripts ===');
    await delay(10000); // 10-second delay before restarting
  }
})();