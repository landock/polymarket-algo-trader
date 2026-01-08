import { useEffect, useRef, useState } from 'react';

export type MarketTokenOption = {
  tokenId: string;
  outcome?: string;
};

export type MarketContext = {
  options: MarketTokenOption[];
  question?: string;
  source: 'none' | 'e2e' | 'next-data';
};

const tokenIdRegex = /^0x[a-fA-F0-9]{64}$/;

const parseJsonArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeTokenIds = (tokens: string[]): string[] => {
  const normalized = tokens.filter((token) => token.length > 0);
  const filtered = normalized.filter((token) => tokenIdRegex.test(token));
  return filtered.length > 0 ? filtered : normalized;
};

const buildOptions = (
  tokenIds: string[],
  outcomes?: string[]
): MarketTokenOption[] => {
  const normalizedTokens = normalizeTokenIds(tokenIds);
  return normalizedTokens.map((tokenId, index) => ({
    tokenId,
    outcome: outcomes?.[index],
  }));
};

const getE2EMarketContext = (): MarketContext | null => {
  const tokenIds = document.documentElement.getAttribute('data-e2e-token-ids');
  if (!tokenIds) {
    return null;
  }

  const outcomes = document.documentElement.getAttribute('data-e2e-outcomes');
  const question = document.documentElement.getAttribute('data-e2e-question') || undefined;
  const options = buildOptions(
    parseJsonArray(tokenIds),
    outcomes ? parseJsonArray(outcomes) : undefined
  );

  return {
    options,
    question,
    source: 'e2e',
  };
};

const normalizeOutcomeLabel = (label: string) => {
  const normalized = label.trim();
  const lower = normalized.toLowerCase();
  if (lower === 'up') return 'Yes';
  if (lower === 'down') return 'No';
  return normalized;
};

const findMarketCandidate = (root: unknown): { tokenIds: string[]; outcomes?: string[]; question?: string } | null => {
  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') {
      continue;
    }

    const node = current as Record<string, unknown>;
    const tokenIdsRaw =
      node.clobTokenIds ??
      node.clobTokenIDs ??
      node.tokenIds ??
      node.tokenIDs ??
      node.outcomeTokenIds ??
      node.outcomeTokenIDs;

    if (tokenIdsRaw) {
      const tokenIds = parseJsonArray(tokenIdsRaw);
      if (tokenIds.length > 0) {
        const outcomesRaw = node.outcomes ?? node.outcomeNames;
        const outcomes = outcomesRaw
          ? parseJsonArray(outcomesRaw).map((label) => normalizeOutcomeLabel(label))
          : undefined;
        const question =
          (typeof node.question === 'string' && node.question) ||
          (typeof node.title === 'string' && node.title) ||
          (typeof node.marketQuestion === 'string' && node.marketQuestion) ||
          undefined;
        return { tokenIds, outcomes, question };
      }
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return null;
};

const getNextDataMarketContext = (): MarketContext | null => {
  const script = document.getElementById('__NEXT_DATA__');
  if (!script?.textContent) {
    return null;
  }

  try {
    const data = JSON.parse(script.textContent);
    const candidate = findMarketCandidate(data);
    if (!candidate) {
      return null;
    }

    const options = buildOptions(candidate.tokenIds, candidate.outcomes);
    if (options.length === 0) {
      return null;
    }

    return {
      options,
      question: candidate.question,
      source: 'next-data',
    };
  } catch {
    return null;
  }
};

const resolveMarketContext = (): MarketContext => {
  const e2e = getE2EMarketContext();
  if (e2e && e2e.options.length > 0) {
    return e2e;
  }

  const fromNext = getNextDataMarketContext();
  if (fromNext && fromNext.options.length > 0) {
    return fromNext;
  }

  return { options: [], source: 'none' };
};

export default function useMarketContext(): MarketContext {
  const [context, setContext] = useState<MarketContext>(() => resolveMarketContext());
  const lastUrlRef = useRef<string>(window.location.href);

  useEffect(() => {
    setContext(resolveMarketContext());

    const interval = window.setInterval(() => {
      if (window.location.href !== lastUrlRef.current) {
        lastUrlRef.current = window.location.href;
        setContext(resolveMarketContext());
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return context;
}
