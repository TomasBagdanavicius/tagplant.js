"use strict";

import { positionalCorners, validateEnumMember } from "../functions/enumeration.js";
import { validateVarInterface } from "../functions/misc.js";
import { buildInsetCSSValue, setCSSProperties } from "../functions/style.js";
import { Point2D } from "./point-2d.js";

/**
 * Calculates new size for given rectangle lengths to match a given aspect
 *     ratio staying in bounds of the original rectangle
 * @param {number} xLength - Inline size of the original rectangle
 * @param {number} yLength - Block size of the original rectangle
 * @param {number} aspectRatio - Aspect ratio to resize to
 * @returns {array} Inline and block lengths matching the desired ratio
 */
export function sizeCropToAspectRatio(xLength, yLength, aspectRatio) {
    const coordsAspectRatio = (xLength / yLength);
    if (coordsAspectRatio === aspectRatio) {
        return [xLength, yLength];
    }
    let x, y;
    if (coordsAspectRatio < aspectRatio) {
        x = xLength;
        y = (xLength / aspectRatio);
    } else {
        x = (yLength * aspectRatio);
        y = yLength;
    }
    return [x, y];
}

/**
 * Calculates the proportional height based on the aspect ratio of the original width and height.
 *
 * @param {number} width - The original width of the element.
 * @param {number} height - The original height of the element.
 * @param {number} newWidth - The new width for which to calculate the proportional height.
 * @returns {number} The calculated proportional height.
 */
export function proportionalHeight(width, height, newWidth) {
    const aspectRatio = width / height;
    return newWidth / aspectRatio;
}

/**
 * Calculates the proportional width based on the aspect ratio of the original width and height.
 *
 * @param {number} width - The original width of the element.
 * @param {number} height - The original height of the element.
 * @param {number} newHeight - The new height for which to calculate the proportional width.
 * @returns {number} The calculated proportional width.
 */
export function proportionalWidth(width, height, newHeight) {
    const aspectRatio = width / height;
    return newHeight * aspectRatio;
}

/**
 * Calculates top and left offset positions relative to a given HTML element
 *     and based on the positionable HTML element
 * @param {string} name - Position name (TL, TR, RT, RB, BR, BL, LB, LT)
 * @param {HTMLElement} relEl - HTML Element that is relative to the position to be calculated
 * @param {HTMLElement} posEl - HTML element that is going to be positioned
 * @returns {array} Array containing left and top positions
 */
export function getTopLeftOffset(name, relEl, posEl) {
    let top, left;
    const relElRect = relEl.getBoundingClientRect(),
        posElRect = posEl.getBoundingClientRect(),
        pw = posElRect.width,
        ph = posElRect.height,
        vw = document.documentElement.clientWidth,
        vh = document.documentElement.clientHeight;
    const axisAndPosElSize = side => {
        const axis = (side === "top" || side === "bottom") ? "y" : "x";
        const p = (axis === "y") ? ph : pw;
        return [axis, p];
    };
    const calc = side => {
        const [axis, p] = axisAndPosElSize(side);
        const v = (axis === "y") ? vh : vw;
        return relElRect[side] + Math.min(0, v - (relElRect[side] + p));
    };
    const calc2 = side => {
        const [, p] = axisAndPosElSize(side);
        return Math.max(0, relElRect[side] - p);
    }
    switch (name) {
        case "TL":
            top = calc2("top");
            left = calc("left");
            break;
        case "TR":
            top = calc2("top");
            left = calc2("right");
            break;
        case "RT":
            top = calc("top");
            left = calc("right");
            break;
        case "RB":
            top = calc2("bottom");
            left = calc("right");
            break;
        case "BR":
            top = calc("bottom");
            left = calc2("right");
            break;
        case "BL":
            top = calc("bottom");
            left = calc("left");
            break;
        case "LB":
            top = calc2("bottom");
            left = calc2("left");
            break;
        case "LT":
            top = calc("top");
            left = calc2("left");
    }
    return [top, left];
}

/**
 * Apply top and left offset positions to an HTML element based on a given position name,
 * relative HTML element, and the element to be positioned.
 *
 * @param {HTMLElement} el - The HTML element to apply top and left offset positions.
 * @param {string} name - Position name (TL, TR, RT, RB, BR, BL, LB, LT).
 * @param {HTMLElement} relEl - HTML Element that is relative to the position to be calculated.
 * @param {boolean} [useInset=false] - Whether to use CSS 'inset' property for positioning.
 * @returns {void}
 */
export function elementApplyTopLeftOffset(el, name, relEl, useInset = false) {
    const [top, left] = getTopLeftOffset(name, relEl, el);
    if (!useInset) {
        el.style.setProperty("top", top + "px");
        el.style.setProperty("left", left + "px");
    } else {
        el.style.setProperty("inset", `${top}px auto auto ${left}px`);
    }
}

/**
 * Contains the given DOM rectangle inside the actual viewport by returning a DOM rectangle that fits.
 *
 * @param {DOMRect | DOMRectReadOnly} rect - The DOM rectangle to be contained within the viewport.
 * @returns {DOMRectReadOnly} A DOM rectangle that fits within the viewport.
 */
export function containInsideActualViewport(rect) {
    validateVarInterface(rect, [DOMRect, DOMRectReadOnly]);
    let { width, height } = rect;
    let y = Math.max(rect.y, 0);
    let x = Math.max(rect.x, 0);
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    if (rect.height > vh) {
        height = vh;
        y = 0;
    } else if (rect.bottom > vh) {
        y = y - (rect.bottom - vh);
    }
    if (rect.width > vw) {
        width = vw;
        x = 0;
    } else if (rect.right > vw) {
        x = x - (rect.right - vw);
    }
    return new DOMRectReadOnly(x, y, width, height);
}

/**
 * Sets the position of an element based on a given point and a positional corner.
 *
 * @param {HTMLElement} elem - The element to position.
 * @param {number} x - The x-coordinate of the reference point.
 * @param {number} y - The y-coordinate of the reference point.
 * @param {Enumeration} [corner=positionalCorners.topleft] - The positional corner reference.
 */
export function setPointPositionalCorner(elem, x, y, corner = positionalCorners.topleft) {
    validateEnumMember(corner, "positionalCorners");
    const originPoint = new Point2D(x, y);
    const originRect = elem.getBoundingClientRect();
    const point = originPoint.shiftByPositionalCorner(corner, originRect.width, originRect.height);
    let rect = new DOMRectReadOnly(point.x, point.y, originRect.width, originRect.height);
    rect = containInsideActualViewport(rect);
    let { top, left, width, height } = rect;
    const properties = {
        inset: buildInsetCSSValue({ top, left })
    };
    if (width != originRect.width) {
        properties.width = `${width}px`;
    }
    if (height != originRect.height) {
        properties.height = `${height}px`;
    }
    setCSSProperties(elem, properties);
}

/**
 * Calculates the lengths of the sides of a right triangle given the hypotenuse and an angle.
 *
 * @param {number} hypotenuse - The length of the hypotenuse.
 * @param {number} angleDegrees - The angle in degrees.
 * @returns {{adjacent: number, opposite: number}} The lengths of the adjacent and opposite sides.
 */
export function calculateTriangleSidesFromHypotenuseAndAngle(hypotenuse, angleDegrees) {
    const angleRadians = angleDegrees * (Math.PI / 180);
    const adjacent = hypotenuse * Math.cos(angleRadians);
    const opposite = hypotenuse * Math.sin(angleRadians);
    return { adjacent, opposite };
}

/**
 * Calculates the lengths of the hypotenuse and adjacent side of a right triangle given the opposite side and an angle.
 *
 * @param {number} opposite - The length of the opposite side.
 * @param {number} angleDegrees - The angle in degrees.
 * @returns {{hypotenuse: number, adjacent: number}} The lengths of the hypotenuse and adjacent side.
 */
export function calculateTriangleSidesFromOppositeAndAngle(opposite, angleDegrees) {
    const angleRadians = angleDegrees * (Math.PI / 180);
    const hypotenuse = opposite / Math.sin(angleRadians);
    const adjacent = hypotenuse * Math.cos(angleRadians);
    return { hypotenuse, adjacent };
}

/**
 * Calculates the lengths of the hypotenuse and opposite side of a right triangle given the adjacent side and an angle.
 *
 * @param {number} adjacent - The length of the adjacent side.
 * @param {number} angleDegrees - The angle in degrees.
 * @returns {{hypotenuse: number, opposite: number}} The lengths of the hypotenuse and opposite side.
 */
export function calculateTriangleSidesFromAdjacentAndAngle(adjacent, angleDegrees) {
    const angleRadians = angleDegrees * (Math.PI / 180);
    const hypotenuse = adjacent / Math.cos(angleRadians);
    const opposite = hypotenuse * Math.sin(angleRadians);
    return { hypotenuse, opposite };
}

/**
 * Calculates the angle of a right triangle given the lengths of the opposite and adjacent sides.
 *
 * @param {number} opposite - The length of the opposite side.
 * @param {number} adjacent - The length of the adjacent side.
 * @returns {number} The angle in degrees.
 */
export function calculateTriangleAngleFromSides(opposite, adjacent) {
    const angleInRadians = Math.atan(opposite / adjacent);
    return angleInRadians * (180 / Math.PI);
}

/**
 * Calculates the side length of the largest square that fits inside a circle.
 *
 * @param {number} diameter - The diameter of the circle.
 * @returns {number} - The side length of the largest square that fits inside the circle.
 */
export function calculateTheLargestSquareThatFitsInsideCircle(diameter) {
    return diameter / Math.sqrt(2);
}