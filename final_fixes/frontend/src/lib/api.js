const API = import.meta.env.VITE_API_URL || ''

async function post(path, body) {
  let r
  try {
    r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    })
  } catch (e) {
    throw new Error('Could not reach the analysis server. It may be waking up from sleep — wait a few seconds and try again.')
  }

  // Read the raw text first so a non-JSON response (e.g. a gateway timeout or
  // error page) doesn't blow up JSON.parse with a cryptic "Unexpected token <".
  const raw = await r.text()
  let data
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    if (r.status === 502 || r.status === 503 || r.status === 504) {
      throw new Error('The server timed out on this request. Large repositories can exceed the free-tier limit — try a smaller repo, or try again once the server is warm.')
    }
    throw new Error(`The server returned an unexpected response (${r.status}). Please try again in a moment.`)
  }

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
// Per-language demo snippets. Each language has an AI-style sample (heavy
// over-narration / placeholder logic), a buggy sample (real defects), and a
// clean sample (idiomatic, no issues). getSample(lang, kind) returns the right
// one for the currently selected language, falling back to Python.
export const SAMPLES_BY_LANG = {
  Python: {
    ai: `def process_data(data):
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


def helper(x):
    # TODO: implement this function
    pass`,
    buggy: `def get_status(code):
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
    return bucket`,
    clean: `def merge_intervals(intervals):
    if not intervals:
        return []
    ordered = sorted(intervals, key=lambda pair: pair[0])
    merged = [ordered[0]]
    for start, end in ordered[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return merged`,
  },

  JavaScript: {
    ai: `function processData(data) {
  // This function takes the given data and processes it
  // Initialize the result array
  let result = [];
  // Loop through each item in the data
  for (let i = 0; i < data.length; i++) {
    // Check if the item is valid
    if (data[i] !== null) {
      // Push the item to the result array
      result.push(data[i]);
    }
  }
  // Return the final result
  return result;
}

function doSomething(input) {
  // TODO: implement this function
}`,
    buggy: `function getStatus(code) {
  if (code == 200) {
    var msg = "OK";
  } else if (code == 404) {
    var msg = "Not Found";
  }
}

function loadConfig(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
  }
}

function addItem(item, bucket = []) {
  bucket.push(item);
  return bucket;
}`,
    clean: `function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const ordered = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [ordered[0]];
  for (let i = 1; i < ordered.length; i++) {
    const [start, end] = ordered[i];
    const last = merged[merged.length - 1];
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}`,
  },

  TypeScript: {
    ai: `function processData(data: any[]): any[] {
  // This function takes the given data and processes it
  // Initialize the result array
  let result: any[] = [];
  // Loop through each item in the data
  for (let i = 0; i < data.length; i++) {
    // Check if the item is valid
    if (data[i] !== null) {
      // Push the item to the result array
      result.push(data[i]);
    }
  }
  // Return the final result
  return result;
}

function helper(x: any): void {
  // TODO: implement this function
}`,
    buggy: `function getStatus(code: number): string {
  if (code == 200) {
    let msg = "OK";
  } else if (code == 404) {
    let msg = "Not Found";
  }
}

function parseConfig(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch (e) {
  }
}`,
    clean: `function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return [];
  const ordered = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [ordered[0]];
  for (let i = 1; i < ordered.length; i++) {
    const [start, end] = ordered[i];
    const last = merged[merged.length - 1];
    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}`,
  },

  Java: {
    ai: `public class Processor {
    // This method takes the given data and processes it
    public List<Object> processData(List<Object> data) {
        // Initialize the result list
        List<Object> result = new ArrayList<>();
        // Loop through each item in the data
        for (int i = 0; i < data.size(); i++) {
            // Check if the item is valid
            if (data.get(i) != null) {
                // Add the item to the result list
                result.add(data.get(i));
            }
        }
        // Return the final result
        return result;
    }

    public void helper(int x) {
        // TODO: implement this method
    }
}`,
    buggy: `public class StatusHelper {
    public String getStatus(int code) {
        if (code == 200) {
            String msg = "OK";
        } else if (code == 404) {
            String msg = "Not Found";
        }
    }

    public String load(String path) {
        try {
            return readFile(path);
        } catch (Exception e) {
        }
        return null;
    }
}`,
    clean: `public class Intervals {
    public List<int[]> merge(List<int[]> intervals) {
        if (intervals.isEmpty()) return new ArrayList<>();
        intervals.sort((a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        merged.add(intervals.get(0));
        for (int i = 1; i < intervals.size(); i++) {
            int[] cur = intervals.get(i);
            int[] last = merged.get(merged.size() - 1);
            if (cur[0] <= last[1]) {
                last[1] = Math.max(last[1], cur[1]);
            } else {
                merged.add(cur);
            }
        }
        return merged;
    }
}`,
  },

  C: {
    ai: `#include <stdlib.h>

/* This function takes the given data and processes it */
int* process_data(int* data, int n, int* out_len) {
    /* Allocate the result array */
    int* result = malloc(sizeof(int) * n);
    /* Initialize the counter */
    int count = 0;
    /* Loop through each item in the data */
    for (int i = 0; i < n; i++) {
        /* Check if the item is valid */
        if (data[i] != 0) {
            /* Store the item in the result array */
            result[count] = data[i];
            count = count + 1;
        }
    }
    /* Return the final result */
    *out_len = count;
    return result;
}`,
    buggy: `#include <stdio.h>
#include <stdlib.h>

int get_status(int code) {
    if (code == 200) {
        int msg = 1;
    } else if (code == 404) {
        int msg = 2;
    }
}

char* load(const char* path) {
    FILE* f = fopen(path, "r");
    char* buf = malloc(1024);
    fread(buf, 1, 1024, f);
    return buf;
}`,
    clean: `#include <stddef.h>

int binary_search(const int* arr, size_t n, int target) {
    size_t lo = 0, hi = n;
    while (lo < hi) {
        size_t mid = lo + (hi - lo) / 2;
        if (arr[mid] == target) {
            return (int) mid;
        } else if (arr[mid] < target) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return -1;
}`,
  },

  'C++': {
    ai: `#include <vector>

// This function takes the given data and processes it
std::vector<int> processData(const std::vector<int>& data) {
    // Initialize the result vector
    std::vector<int> result;
    // Loop through each item in the data
    for (size_t i = 0; i < data.size(); i++) {
        // Check if the item is valid
        if (data[i] != 0) {
            // Push the item to the result vector
            result.push_back(data[i]);
        }
    }
    // Return the final result
    return result;
}

void helper(int x) {
    // TODO: implement this function
}`,
    buggy: `#include <string>
#include <fstream>

int getStatus(int code) {
    if (code == 200) {
        std::string msg = "OK";
    } else if (code == 404) {
        std::string msg = "Not Found";
    }
}

char* load(const std::string& path) {
    std::ifstream f(path);
    char* buf = new char[1024];
    f.read(buf, 1024);
    return buf;
}`,
    clean: `#include <vector>
#include <algorithm>

std::vector<std::pair<int,int>> merge(std::vector<std::pair<int,int>> intervals) {
    if (intervals.empty()) return {};
    std::sort(intervals.begin(), intervals.end());
    std::vector<std::pair<int,int>> merged{intervals[0]};
    for (size_t i = 1; i < intervals.size(); i++) {
        auto& last = merged.back();
        if (intervals[i].first <= last.second) {
            last.second = std::max(last.second, intervals[i].second);
        } else {
            merged.push_back(intervals[i]);
        }
    }
    return merged;
}`,
  },
}

// Pick a sample for the active language; fall back to Python if unknown.
export function getSample(lang, kind) {
  const byLang = SAMPLES_BY_LANG[lang] || SAMPLES_BY_LANG.Python
  return byLang[kind] || SAMPLES_BY_LANG.Python[kind]
}

// Back-compat aliases (Python defaults) for any older references.
export const SAMPLES = {
  ai_python: SAMPLES_BY_LANG.Python.ai,
  buggy_python: SAMPLES_BY_LANG.Python.buggy,
  clean_python: SAMPLES_BY_LANG.Python.clean,
}
