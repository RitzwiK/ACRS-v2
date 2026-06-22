const API = import.meta.env.VITE_API_URL || ''

async function post(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`)
  return data
}

export const api = {
  analyzeRepo: (repo_url, opts = {}) => post('/api/analyze', { repo_url, ...opts }),
  analyzeSnippet: (code, language) => post('/api/analyze-snippet', { code, language }),
  aiDetect: (code, language) => post('/api/ai-detect', { code, language }),
  benchmark: () => post('/api/benchmark', {}),
}

// severity → desaturated functional tint (monochrome luxury)
export const sevColor = {
  critical: 'var(--neg)',
  warning: 'var(--mid)',
  info: 'var(--silver)',
  none: 'var(--pos)',
}

export const catColor = {
  'Bug-Prone': 'var(--neg)',
  'Code Smell': 'var(--mid)',
  'Design Inefficiency': 'var(--silver)',
  Clean: 'var(--pos)',
}

export const bandColor = {
  very_likely: 'var(--red)',
  likely: 'var(--neg)',
  possible: 'var(--mid)',
  unlikely: 'var(--pos)',
}

export const LANGS = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C', 'C++']

export function langExt(lang) {
  return { Python: 'py', JavaScript: 'js', TypeScript: 'ts', Java: 'java', C: 'c', 'C++': 'cpp' }[lang] || 'py'
}

// a couple of demo snippets students can load instantly
export const SAMPLES = {
  ai_python: `def process_data(data):
    """This function takes the given data and processes it. We then return the result."""
    # Initialize the result list
    result = []
    # Loop through each item in the data
    for item in data:
        # Check if the item is valid
        if item is not None:
            # Append the item to the result list
            result.append(item)
    # Return the final result
    return result


def do_something(input):
    """This method is used to do something with the input value."""
    try:
        # Multiply the input by two
        temp = input * 2
        return temp
    except Exception:
        pass


def helper(x):
    # TODO: implement this function
    pass`,

  buggy_python: `def get_status(code):
    if code == 200:
        msg = "OK"
    elif code == 404:
        msg = "Not Found"
    elif code == 500:
        msg = "Server Error"


def load(path):
    try:
        with open(path) as f:
            return f.read()
    except:
        return None


def append_item(item, bucket=[]):
    bucket.append(item)
    return bucket


def scan(matrix):
    for row in matrix:
        for cell in row:
            if cell:
                if cell > 0:
                    if cell % 2 == 0:
                        print(cell)`,

  clean_python: `import hashlib


def fingerprint(payload: bytes, *, rounds: int = 3) -> str:
    digest = payload
    for _ in range(rounds):
        digest = hashlib.sha256(digest).digest()
    return digest.hex()[:16]


def merge_intervals(intervals):
    if not intervals:
        return []
    intervals.sort(key=lambda iv: iv[0])
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return merged`,
}
