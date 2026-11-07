import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingDisplayStatus } from "../lib/booking-status.ts";
test("pending expires exactly at its start time without changing the record",()=>{
 const booking={status:"pending",startsAt:"2030-01-01T12:00:00Z"};const start=Date.parse(booking.startsAt);
 assert.equal(bookingDisplayStatus(booking,start-1),"pending");assert.equal(bookingDisplayStatus(booking,start),"expired");assert.equal(booking.status,"pending");
});
test("confirmed/cancelled/completed bookings never expire as pending requests",()=>{
 for(const status of ["confirmed","cancelled","completed","declined","expired"])assert.equal(bookingDisplayStatus({status,startsAt:"2030-01-01T12:00:00Z"},Date.parse("2030-01-02T12:00:00Z")),status);
});
