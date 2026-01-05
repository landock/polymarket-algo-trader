/**
 * Dependency Test for Service Worker
 *
 * Run this in the service worker console to check for missing polyfills/dependencies
 */

export async function testServiceWorkerDependencies() {
  console.log('=== Service Worker Dependency Test ===\n');

  const results: { test: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];

  // Test 1: Buffer availability
  try {
    const buf = Buffer.from('test');
    const hex = buf.toString('hex');
    if (hex === '74657374') {
      results.push({ test: 'Buffer polyfill', status: 'PASS' });
    } else {
      results.push({ test: 'Buffer polyfill', status: 'FAIL', error: 'Invalid output' });
    }
  } catch (error: any) {
    results.push({ test: 'Buffer polyfill', status: 'FAIL', error: error.message });
  }

  // Test 2: crypto.createHmac (needed for CLOB API signing)
  try {
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', 'secret');
    hmac.update('test');
    const result = hmac.digest('hex');
    if (result) {
      results.push({ test: 'crypto.createHmac', status: 'PASS' });
    } else {
      results.push({ test: 'crypto.createHmac', status: 'FAIL', error: 'No digest' });
    }
  } catch (error: any) {
    results.push({ test: 'crypto.createHmac', status: 'FAIL', error: error.message });
  }

  // Test 3: crypto.createHash
  try {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update('test');
    const result = hash.digest('hex');
    if (result) {
      results.push({ test: 'crypto.createHash', status: 'PASS' });
    } else {
      results.push({ test: 'crypto.createHash', status: 'FAIL', error: 'No digest' });
    }
  } catch (error: any) {
    results.push({ test: 'crypto.createHash', status: 'FAIL', error: error.message });
  }

  // Test 4: ethers.js Wallet creation
  try {
    const { Wallet } = await import('ethers');
    const testKey = '0x' + '1'.repeat(64);
    const wallet = new Wallet(testKey);
    if (wallet.address) {
      results.push({ test: 'ethers.Wallet', status: 'PASS' });
    } else {
      results.push({ test: 'ethers.Wallet', status: 'FAIL', error: 'No address' });
    }
  } catch (error: any) {
    results.push({ test: 'ethers.Wallet', status: 'FAIL', error: error.message });
  }

  // Test 5: ClobClient import
  try {
    const { ClobClient } = await import('@polymarket/clob-client');
    if (ClobClient) {
      results.push({ test: 'ClobClient import', status: 'PASS' });
    } else {
      results.push({ test: 'ClobClient import', status: 'FAIL', error: 'Not found' });
    }
  } catch (error: any) {
    results.push({ test: 'ClobClient import', status: 'FAIL', error: error.message });
  }

  // Test 6: axios with fetch adapter
  try {
    const axios = await import('axios');
    const response = await axios.default.get('https://clob.polymarket.com/');
    if (response) {
      results.push({ test: 'axios fetch adapter', status: 'PASS' });
    }
  } catch (error: any) {
    // Network errors are OK, we just want to verify axios works
    if (error.message && !error.message.includes('adapter')) {
      results.push({ test: 'axios fetch adapter', status: 'PASS' });
    } else {
      results.push({ test: 'axios fetch adapter', status: 'FAIL', error: error.message });
    }
  }

  // Test 7: stream module
  try {
    const stream = await import('stream');
    if (stream.Readable) {
      results.push({ test: 'stream polyfill', status: 'PASS' });
    } else {
      results.push({ test: 'stream polyfill', status: 'FAIL', error: 'No Readable' });
    }
  } catch (error: any) {
    results.push({ test: 'stream polyfill', status: 'FAIL', error: error.message });
  }

  // Test 8: util module
  try {
    const util = await import('util');
    if (typeof util.format === 'function') {
      results.push({ test: 'util polyfill', status: 'PASS' });
    } else {
      results.push({ test: 'util polyfill', status: 'FAIL', error: 'No format' });
    }
  } catch (error: any) {
    results.push({ test: 'util polyfill', status: 'FAIL', error: error.message });
  }

  // Test 9: process global
  try {
    if (typeof process !== 'undefined' && process.env) {
      results.push({ test: 'process global', status: 'PASS' });
    } else {
      results.push({ test: 'process global', status: 'FAIL', error: 'Not defined or no env' });
    }
  } catch (error: any) {
    results.push({ test: 'process global', status: 'FAIL', error: error.message });
  }

  // Test 10: JSON stringify/parse (basic)
  try {
    const obj = { test: 'value', nested: { key: 123 } };
    const str = JSON.stringify(obj);
    const parsed = JSON.parse(str);
    if (parsed.test === 'value' && parsed.nested.key === 123) {
      results.push({ test: 'JSON operations', status: 'PASS' });
    } else {
      results.push({ test: 'JSON operations', status: 'FAIL', error: 'Invalid parse' });
    }
  } catch (error: any) {
    results.push({ test: 'JSON operations', status: 'FAIL', error: error.message });
  }

  // Test 11: chrome.storage API
  try {
    await chrome.storage.local.set({ test_key: 'test_value' });
    const result = await chrome.storage.local.get('test_key');
    await chrome.storage.local.remove('test_key');
    if (result.test_key === 'test_value') {
      results.push({ test: 'chrome.storage', status: 'PASS' });
    } else {
      results.push({ test: 'chrome.storage', status: 'FAIL', error: 'Invalid result' });
    }
  } catch (error: any) {
    results.push({ test: 'chrome.storage', status: 'FAIL', error: error.message });
  }

  // Test 12: Fetch API
  try {
    const response = await fetch('https://clob.polymarket.com/');
    if (response) {
      results.push({ test: 'Fetch API', status: 'PASS' });
    }
  } catch (error: any) {
    // Network errors are OK
    if (error.message && !error.message.includes('not defined')) {
      results.push({ test: 'Fetch API', status: 'PASS' });
    } else {
      results.push({ test: 'Fetch API', status: 'FAIL', error: error.message });
    }
  }

  // Print results
  console.log('\n=== Test Results ===\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(`\n=== Summary ===`);
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);

  if (failed > 0) {
    console.log('\n⚠️ ATTENTION: Some dependencies are missing!');
    console.log('The extension may not work correctly until these are fixed.');
  } else {
    console.log('\n🎉 All dependencies are available!');
    console.log('The service worker is ready for order execution.');
  }

  return results;
}

// Make test available in console
(globalThis as any).testDependencies = testServiceWorkerDependencies;

console.log('Dependency test loaded. Run testDependencies() in console to test.');
