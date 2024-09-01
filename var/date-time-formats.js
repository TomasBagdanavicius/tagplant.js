"use strict";

export const dateTimeFormats = {
    Time12: {
        title: "Time 12",
        name: "time-12",
        options: {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }
    },
    Time24: {
        title: "Time 24",
        name: "time-24",
        options: {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }
    },
    Time12Short: {
        title: "Time 12 Short",
        name: "time-12-short",
        options: {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        }
    },
    Time24Short: {
        title: "Time 24 Short",
        name: "time-24-short",
        options: {
            hour: "numeric",
            minute: "2-digit",
            hour12: false
        },
    },
    LongDateTime: {
        title: "Long Date Time",
        name: "long-date-time",
        options: {
            month: "long",
            day: "numeric",
            weekday: "long",
            hour: "2-digit",
            minute: "2-digit",
        }
    },
    ShortDateTime: {
        title: "Short Date Time",
        name: "short-date-time",
        options: {
            month: "2-digit",
            day: "2-digit",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
        }
    },
    ExtendedDateTime: {
        title: "Extended Date Time",
        name: "extended-date-time",
        options: {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
        }
    },
    SimpleDateTime: {
        title: "Simple Date Time",
        name: "simple-date-time",
        options: {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: false
        }
    }
};