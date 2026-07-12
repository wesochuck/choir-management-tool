import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MODULE_IDS,
  RECOMMENDED_MODULES,
  enableModule,
  getDisableCascade,
  isModuleRoute,
  getModuleForRoute,
} from '../src/lib/modules';

describe('modules registry', () => {
  it('defines 17 modules and recommended list', () => {
    assert.strictEqual(MODULE_IDS.length, 17);
    assert.deepStrictEqual(
      [...RECOMMENDED_MODULES],
      ['roster', 'events', 'musicLibrary', 'setLists']
    );
  });

  it('automatically enables prerequisites recursively', () => {
    // setLists depends on musicLibrary and events
    const enabled = enableModule(new Set(), 'setLists');
    assert.ok(enabled.has('setLists'));
    assert.ok(enabled.has('musicLibrary'));
    assert.ok(enabled.has('events'));

    // attendance depends on events and roster
    const enabledAttendance = enableModule(new Set(), 'attendance');
    assert.ok(enabledAttendance.has('attendance'));
    assert.ok(enabledAttendance.has('events'));
    assert.ok(enabledAttendance.has('roster'));
  });

  it('determines the disabled cascade correctly', () => {
    // Disabling roster should cascadingly disable attendance
    const cascade = getDisableCascade(new Set(['roster', 'attendance']), 'roster');
    assert.deepStrictEqual(cascade, ['attendance', 'roster']);

    // Disabling events should cascade to setLists
    const cascadeEvents = getDisableCascade(
      new Set(['events', 'musicLibrary', 'setLists']),
      'events'
    );
    assert.ok(cascadeEvents.indexOf('setLists') < cascadeEvents.indexOf('events'));
  });

  it('resolves routes to modules correctly', () => {
    assert.strictEqual(getModuleForRoute('/admin/roster'), 'roster');
    assert.strictEqual(getModuleForRoute('/rsvp'), 'rsvps');
    assert.strictEqual(getModuleForRoute('/admin/tickets/scan'), 'ticketSales');
    assert.strictEqual(getModuleForRoute('/setup'), undefined); // non-module route

    assert.ok(isModuleRoute('/donate'));
    assert.ok(!isModuleRoute('/login'));
  });
});
