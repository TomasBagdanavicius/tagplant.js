"use strict";

import { expect } from "chai";
import { MyDate } from "../../../src/core/date-time/my-date.js";

let date;
before(() => {
    date = new MyDate(2000, 0, 1, 0, 0, 0);
});

describe("MyDate", () => {
    it("should convert date to parts correctly", () => {
        const parts = date.toParts();
        expect(parts).to.deep.equal({
            year: 2000,
            day: 1,
            month: 0,
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0
        });
    });
    it("should convert 24-hour format to 12-hour format correctly", () => {
        const hour12 = MyDate.convertTo12HourFormat(12);
        expect(hour12).to.equal(12);
    });
    it("should get day period number from 24-hour format correctly", () => {
        const periodNumber = MyDate.getDayPeriodNumberFromHour24(12);
        expect(periodNumber).to.equal(2);
    });
});