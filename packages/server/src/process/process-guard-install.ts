import { consoleToStderr, guardProcess, muteStreamErrors } from './process-guard.js';

consoleToStderr(console, process.stderr);
muteStreamErrors(process.stdout, process.stderr);
guardProcess(process, text => {
  process.stderr.write(text);
});
