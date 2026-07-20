import { execFile, spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const EXPECTED_POCKETBASE_VERSION = '0.36.9';
const STARTUP_TIMEOUT_MS = 20_000;
const SHUTDOWN_TIMEOUT_MS = 5_000;
const execFileAsync = promisify(execFile);

function reserveAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not reserve a local port for PocketBase'));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function sanitizeOutput(value) {
  return value
    .replace(/(\/_\/#\/pbinstal\/)[^\s]+/g, '$1[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_TOKEN]');
}

async function waitForHealth(baseUrl, child, getOutput) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `PocketBase exited with code ${child.exitCode} before becoming healthy.\n${sanitizeOutput(getOutput())}`
      );
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The server may not have bound its port yet.
    }

    await wait(100);
  }

  throw new Error(`PocketBase did not become healthy in time.\n${sanitizeOutput(getOutput())}`);
}

async function stopProcess(child) {
  if (child.exitCode !== null) return;

  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  const timedOut = wait(SHUTDOWN_TIMEOUT_MS).then(() => 'timeout');

  if ((await Promise.race([exited, timedOut])) === 'timeout' && child.exitCode === null) {
    child.kill('SIGKILL');
    await new Promise((resolve) => child.once('exit', resolve));
  }
}

async function main() {
  const binaryPath = process.env.POCKETBASE_BIN;
  if (!binaryPath) {
    throw new Error(
      `POCKETBASE_BIN must point to a PocketBase ${EXPECTED_POCKETBASE_VERSION} binary`
    );
  }

  await access(binaryPath);
  const versionResult = await execFileAsync(binaryPath, ['--version']);
  const versionOutput = `${versionResult.stdout}\n${versionResult.stderr}`;
  if (!versionOutput.includes(`version ${EXPECTED_POCKETBASE_VERSION}`)) {
    throw new Error(
      `Expected PocketBase ${EXPECTED_POCKETBASE_VERSION}, received: ${versionOutput.trim()}`
    );
  }

  const repoRoot = process.cwd();
  const dataDir = await mkdtemp(path.join(tmpdir(), 'choir-pb-runtime-smoke-'));
  const port = await reserveAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let output = '';
  const child = spawn(
    binaryPath,
    [
      'serve',
      '--dir',
      dataDir,
      '--hooksDir',
      path.join(repoRoot, 'pocketbase/pb_hooks'),
      '--migrationsDir',
      path.join(repoRoot, 'pocketbase/pb_migrations'),
      '--http',
      `127.0.0.1:${port}`,
      '--hooksPool',
      '1',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForHealth(baseUrl, child, () => output);

    const generatedMain = await readFile(
      path.join(repoRoot, 'pocketbase/pb_hooks/main.pb.js'),
      'utf8'
    );
    const fingerprintMatch = generatedMain.match(/fingerprint: "([a-f0-9]{16})"/);
    if (!fingerprintMatch) {
      throw new Error('Generated hook bundle does not contain a source fingerprint.');
    }

    const hookHealthResponse = await fetch(`${baseUrl}/api/hooks/health`);
    const hookHealthBody = await hookHealthResponse.json().catch(() => null);
    if (
      !hookHealthResponse.ok ||
      hookHealthBody?.ok !== true ||
      hookHealthBody?.fingerprint !== fingerprintMatch[1]
    ) {
      throw new Error(
        [
          'PocketBase did not load the expected generated hook bundle.',
          `Expected fingerprint: ${fingerprintMatch[1]}`,
          `Received: ${hookHealthResponse.status} ${JSON.stringify(hookHealthBody)}`,
          sanitizeOutput(output),
        ].join('\n')
      );
    }

    const setupResponse = await fetch(`${baseUrl}/api/setup/status`);
    const setupBody = await setupResponse.json().catch(() => null);
    if (
      !setupResponse.ok ||
      typeof setupBody?.state !== 'string' ||
      typeof setupBody?.initialized !== 'boolean'
    ) {
      throw new Error(
        [
          'Setup route did not execute its sliced callback-local helpers.',
          `Received: ${setupResponse.status} ${JSON.stringify(setupBody)}`,
          sanitizeOutput(output),
        ].join('\n')
      );
    }

    const response = await fetch(`${baseUrl}/api/player-playlist`);
    const responseText = await response.text();
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = null;
    }

    if (response.status !== 400 || responseBody?.error !== 'Missing token') {
      throw new Error(
        [
          'Guarded route did not reach its callback-local validation.',
          `Expected: 400 {"error":"Missing token"}`,
          `Received: ${response.status} ${responseText}`,
          sanitizeOutput(output),
        ].join('\n')
      );
    }

    process.stdout.write(
      `PocketBase ${EXPECTED_POCKETBASE_VERSION} callback-scope smoke check passed.\n`
    );
  } finally {
    await stopProcess(child);
    await rm(dataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
