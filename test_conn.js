const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  try {
    const res = await fetch('http://127.0.0.1:5000/');
    const text = await res.text();
    console.log('Response from http://127.0.0.1:5000/:', text);
  } catch (err) {
    console.error('Failed to reach http://127.0.0.1:5000/:', err.message);
  }
}

test();
