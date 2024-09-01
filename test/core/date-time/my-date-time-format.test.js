"use strict";

import { expect } from "chai";
import { MyDate } from "../../../src/core/date-time/my-date.js";
import { DateTimeFormat } from "../../../src/core/date-time/date-time-format.js";
import { dateTimeFormats } from "../../../var/date-time-formats.js";

let date, format;
before(() => {
    date = new MyDate(2024, 0, 15, 15, 59, 59);
    format = new DateTimeFormat(dateTimeFormats.LongDateTime.options, { date, locale: "en-US" });
});

describe("DateTimeFormat", () => {
    it("should format date correctly to string", () => {
        expect(format.toString()).to.equal("Monday, January 15 at 03:59 PM");
    });
    it("should return false when checking for year part", () => {
        expect(format.hasPart("year")).to.be.false;
    });
    it("should change common parts and format date correctly to string", () => {
        format.changeCommonParts({ month: 1 });
        expect(format.toString()).to.equal("Thursday, February 15 at 03:59 PM");
    });
    it("should return an instance of DocumentFragment", () => {
        expect(format.toDocumentFragment()).to.be.instanceOf(DocumentFragment);
    });
});