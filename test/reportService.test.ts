import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { reportService } from '../src/services/reportService.ts';
import { rosterService } from '../src/services/rosterService.ts';
import { profileService } from '../src/services/profileService.ts';

type CollectionMock = ReturnType<typeof pb.collection>;

test('reportService', async (t) => {
  const originalCollection = pb.collection;
  const originalFilter = pb.filter;

  t.afterEach(() => {
    pb.collection = originalCollection;
    pb.filter = originalFilter;
  });

  await t.test('getPerformances calls PocketBase correctly', async (t) => {
    const performances = [
      { id: 'perf_1', name: 'Spring Concert' }
    ];

    const getFullList = t.mock.fn(async () => performances);

    pb.collection = function (name: string) {
      if (name === 'events') {
        return { getFullList } as unknown as CollectionMock;
      }
      return originalCollection(name);
    };

    const result = await reportService.getPerformances();

    assert.deepEqual(result, performances);
    assert.equal(getFullList.mock.callCount(), 1);
    assert.deepEqual(getFullList.mock.calls[0].arguments[0], {
      filter: 'type = "Performance" && isArchived != true',
      sort: '-date',
    });
  });

  await t.test('getConcertSummary returns early when no rehearsals', async (t) => {
    const performance = { id: 'perf_1', type: 'Performance', name: 'Spring Concert' };

    const getOne = t.mock.fn(async () => performance);
    const getFullList = t.mock.fn(async () => []); // No rehearsals
    pb.filter = t.mock.fn((str, params) => `${str}_${JSON.stringify(params)}`);

    pb.collection = function (name: string) {
      if (name === 'events') {
        return { getOne, getFullList } as unknown as CollectionMock;
      }
      return originalCollection(name);
    };

    const result = await reportService.getConcertSummary('perf_1');

    assert.equal(getOne.mock.callCount(), 1);
    assert.equal(getOne.mock.calls[0].arguments[0], 'perf_1');
    assert.equal(getFullList.mock.callCount(), 1);

    assert.deepEqual(result, {
      performance,
      rehearsals: [],
      totalRehearsals: 0,
      avgAttendanceRate: 0,
      singerReports: [],
    });
  });

  await t.test('getConcertSummary processes rosters and aggregates stats correctly', async (t) => {
    const performance = { id: 'perf_1', type: 'Performance', name: 'Spring Concert' };
    const rehearsals = [
      { id: 'reh_1', type: 'Rehearsal' },
      { id: 'reh_2', type: 'Rehearsal' },
    ];

    const getOne = t.mock.fn(async () => performance);
    const getFullList = t.mock.fn(async () => rehearsals);
    pb.filter = t.mock.fn((str, params) => `${str}_${JSON.stringify(params)}`);

    pb.collection = function (name: string) {
      if (name === 'events') {
        return { getOne, getFullList } as unknown as CollectionMock;
      }
      return originalCollection(name);
    };

    const getEventRosterMock = t.mock.method(rosterService, 'getEventRoster');
    getEventRosterMock.mock.mockImplementation(async (eventId: string) => {
      if (eventId === 'reh_1') {
        return [
          { profile: 'prof_1', attendance: 'Present' },
          { profile: 'prof_2', attendance: 'Absent' },
          { profile: 'prof_3', attendance: 'Pending' }, // Does not count for presence/absence
        ];
      } else if (eventId === 'reh_2') {
        return [
          { profile: 'prof_1', attendance: 'Absent' },
          { profile: 'prof_2', attendance: 'Absent' },
          { profile: 'prof_4', attendance: 'Present' },
        ];
      }
      return [];
    });

    const getProfilesMock = t.mock.method(profileService, 'getProfiles');
    getProfilesMock.mock.mockImplementation(async () => [
      { id: 'prof_1', name: 'Alice', voicePart: 'Soprano' },
      { id: 'prof_2', name: 'Bob', voicePart: 'Tenor' },
      { id: 'prof_3', name: 'Charlie', voicePart: 'Bass' },
      // prof_4 missing to test Unknown fallback
    ]);

    const result = await reportService.getConcertSummary('perf_1');

    assert.deepEqual(result.performance, performance);
    assert.deepEqual(result.rehearsals, rehearsals);
    assert.equal(result.totalRehearsals, 2);

    // Profile 1: Alice (1 Present, 1 Absent)
    // Profile 2: Bob (0 Present, 2 Absent)
    // Profile 3: Charlie (0 Present, 0 Absent - 1 Pending)
    // Profile 4: Unknown (1 Present, 0 Absent)

    assert.equal(result.singerReports.length, 4);

    // Should be sorted by absences (descending), then name (ascending)
    // 1. Bob: 2 absences, name 'Bob'
    // 2. Alice: 1 absence, name 'Alice'
    // 3. Charlie: 0 absences, name 'Charlie'
    // 4. Unknown: 0 absences, name 'Unknown'

    assert.deepEqual(result.singerReports[0], {
      profileId: 'prof_2',
      name: 'Bob',
      voicePart: 'Tenor',
      absences: 2,
      presenceCount: 0,
      totalEvents: 2,
      attendanceRate: 0,
    });

    assert.deepEqual(result.singerReports[1], {
      profileId: 'prof_1',
      name: 'Alice',
      voicePart: 'Soprano',
      absences: 1,
      presenceCount: 1,
      totalEvents: 2,
      attendanceRate: 50,
    });

    assert.deepEqual(result.singerReports[2], {
      profileId: 'prof_3',
      name: 'Charlie',
      voicePart: 'Bass',
      absences: 0,
      presenceCount: 0,
      totalEvents: 1,
      attendanceRate: 0,
    });

    assert.deepEqual(result.singerReports[3], {
      profileId: 'prof_4',
      name: 'Unknown',
      voicePart: 'Unknown',
      absences: 0,
      presenceCount: 1,
      totalEvents: 1,
      attendanceRate: 100,
    });

    const expectedAvg = (0 + 50 + 0 + 100) / 4;
    assert.equal(result.avgAttendanceRate, expectedAvg);
  });
});
