import test from 'node:test';
import assert from 'node:assert/strict';
import { reserveTravelDays } from '../src/utils/travelSchedule.js';
import { addDays, daysBetween } from '../src/utils/tripDates.js';

test('regeneration uses every calendar date even after a journey card is removed', () => {
  const startDate = '2026-10-28', endDate = '2026-10-31';
  const days = Array.from({length: daysBetween(startDate, endDate) + 1}, (_, index) => ({day:index+1,date:addDays(startDate,index),title:'Explore',estimatedCost:100}));
  const plan = reserveTravelDays({startDate,endDate,days,source:'Origin',destination:'Destination',removedJourneys:['onward'],travelInfo:{durationHours:8,recommendedMode:'Bus'}});
  assert.equal(plan.days.length,4);
  assert.equal(plan.days[0].date,startDate);
  assert.equal(plan.days[0].travelReservation,undefined);
  assert.equal(plan.days[3].travelReservation.journeyId,'return');
  assert.deepEqual(plan.travelSchedule.journeys.map(journey=>journey.id),['return']);
});
