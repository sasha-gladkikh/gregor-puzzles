import test from 'node:test';
import assert from 'node:assert/strict';
import {recordedTime,runningTime} from '../game/time.mjs';
import {playerTime} from '../game/player-ui.mjs';
test('completion and history show the same precision at minute boundaries',()=>{
 for(const seconds of [0,42.125,59.9999,563,3601.2])assert.equal(recordedTime(seconds),playerTime(seconds));
 assert.equal(recordedTime(59.9999),'1:00.000');
 assert.equal(recordedTime(563),'9:23.000');
 assert.equal(runningTime(59.9999),'0:59');
 for(const value of [null,undefined,NaN,-1]){assert.equal(recordedTime(value),'—');assert.equal(runningTime(value),'—');}
});
