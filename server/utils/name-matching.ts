import jaroWinklerLib from 'jaro-winkler'

// Levenshtein distance — used alongside Jaro-Winkler for transcription-mangled names
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

function normalizedLevenshtein(a: string, b: string): number {
  const dist = levenshtein(a, b)
  return 1 - dist / Math.max(a.length, b.length)
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, ' ').replace(/\s+/g, ' ').trim()
}

export interface MatchCandidate {
  id: string
  name: string
}

export interface MatchResult {
  candidate: MatchCandidate
  score: number
}

// Returns the best match above the threshold, or null if none found.
// Threshold is deliberately loose (0.6) to handle transcription errors like
// "Varun" → "Wow run" or "Deepika" → "Deep eeka".
export function findBestMatch(
  query: string,
  candidates: MatchCandidate[],
  threshold = 0.6
): MatchResult | null {
  const normalizedQuery = normalize(query)
  let best: MatchResult | null = null

  for (const candidate of candidates) {
    const normalizedCandidate = normalize(candidate.name)
    const jaroScore = jaroWinklerLib(normalizedQuery, normalizedCandidate)
    const levScore = normalizedLevenshtein(normalizedQuery, normalizedCandidate)
    // Weighted average: Jaro-Winkler is generally better for names
    const score = jaroScore * 0.7 + levScore * 0.3

    if (score >= threshold && (!best || score > best.score)) {
      best = { candidate, score }
    }
  }

  return best
}

export function rankMatches(
  query: string,
  candidates: MatchCandidate[],
  topK = 3
): MatchResult[] {
  const normalizedQuery = normalize(query)
  return candidates
    .map((candidate) => {
      const normalizedCandidate = normalize(candidate.name)
      const jaroScore = jaroWinklerLib(normalizedQuery, normalizedCandidate)
      const levScore = normalizedLevenshtein(normalizedQuery, normalizedCandidate)
      return { candidate, score: jaroScore * 0.7 + levScore * 0.3 }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
