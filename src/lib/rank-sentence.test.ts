import assert from "node:assert/strict";
import { test } from "node:test";
import { rankSentence } from "./rank-sentence.ts";

const at = (rank: number, of: number) => ({ rank, of, value: 0 });

test("upper half reads as 'more than' the share below", () => {
  // Bondi-like: 406 of 580 others sit below.
  assert.equal(
    rankSentence("safety", at(407, 581)),
    "More recorded incidents than 70% of 581 suburbs on this map",
  );
});

test("lower half reads as 'fewer than' the share above", () => {
  assert.equal(
    rankSentence("safety", at(2, 101)),
    "Fewer recorded incidents than 99% of 101 suburbs on this map",
  );
});

test("ends say most / fewest, never 100% or 0%", () => {
  assert.equal(
    rankSentence("safety", at(581, 581)),
    "The most recorded incidents of 581 suburbs on this map",
  );
  assert.equal(
    rankSentence("safety", at(1, 581)),
    "The fewest recorded incidents of 581 suburbs on this map",
  );
  assert.doesNotMatch(rankSentence("housing", at(580, 581)), /100%/);
  assert.doesNotMatch(rankSentence("housing", at(2, 581)), /100%/);
});

test("every layer uses its own words", () => {
  assert.match(rankSentence("housing", at(90, 100)), /^Higher rent than/);
  assert.match(rankSentence("transit", at(10, 100)), /^Less of the suburb near a stop than/);
  assert.match(rankSentence("backgrounds", at(90, 100)), /^Higher share born in Australia than/);
});

test("a single ranked suburb does not divide by zero", () => {
  assert.equal(rankSentence("housing", at(1, 1)), "Only suburb ranked on this map");
});

test("large counts are grouped", () => {
  assert.match(rankSentence("safety", at(1500, 2000)), /of 2,000 suburbs/);
});
