import { describe, it, expect, vi } from 'vitest';
import { findMatchByCode } from '../firebase/matches.js';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    query: vi.fn(),
    where: vi.fn()
  };
});

describe('Match Code Disambiguation & Resolution', () => {
  it('prioritizes in_progress matches over completed/inactive when codes match', async () => {
    const mockDocs = [
      {
        id: '9XLZ4G_OLD',
        data: () => ({
          code: '9XLZ4G',
          status: 'completed',
          updatedAt: 1794118980216,
          summary: { score: 162, wickets: 4 }
        })
      },
      {
        id: 'match_active_live',
        data: () => ({
          code: '9XLZ4G',
          status: 'in_progress',
          updatedAt: 1794116893035,
          lastSeen: 1794121924434,
          summary: { score: 149, wickets: 4 }
        })
      }
    ];

    vi.spyOn(firestore, 'getDocs').mockResolvedValueOnce({
      empty: false,
      docs: mockDocs
    });

    const resolved = await findMatchByCode('9XLZ4G');
    expect(resolved).toBeTruthy();
    expect(resolved.matchId).toBe('match_active_live');
    expect(resolved.status).toBe('in_progress');
    expect(resolved.summary.score).toBe(149);
  });

  it('prioritizes latest updatedAt when multiple in_progress matches exist', async () => {
    const mockDocs = [
      {
        id: 'match_older_session',
        data: () => ({
          code: 'TEST99',
          status: 'in_progress',
          updatedAt: 1000,
          summary: { score: 10, wickets: 1 }
        })
      },
      {
        id: 'match_newer_session',
        data: () => ({
          code: 'TEST99',
          status: 'in_progress',
          updatedAt: 5000,
          summary: { score: 75, wickets: 2 }
        })
      }
    ];

    vi.spyOn(firestore, 'getDocs').mockResolvedValueOnce({
      empty: false,
      docs: mockDocs
    });

    const resolved = await findMatchByCode('TEST99');
    expect(resolved).toBeTruthy();
    expect(resolved.matchId).toBe('match_newer_session');
    expect(resolved.summary.score).toBe(75);
  });

  it('handles doc snapshot hydration fallback properly', () => {
    const docData = {
      code: '9XLZ4G',
      status: 'completed',
      teams: [{ name: 'Team Hafiz' }, { name: 'Team Amjad' }],
      innings: [
        { battingTeam: 'Team Hafiz', score: 158, wickets: 10, legalBalls: 89 },
        { battingTeam: 'Team Amjad', score: 162, wickets: 4, legalBalls: 67 }
      ],
      summary: { score: 162, wickets: 4, legalBalls: 67, battingTeam: 'Team Amjad' }
    };

    expect(docData.innings.length).toBe(2);
    expect(docData.summary.score).toBe(162);
    expect(docData.innings[0].score).toBe(158);
  });
});
