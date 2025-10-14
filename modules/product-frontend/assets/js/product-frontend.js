(function () {
    'use strict';

    function parseRgb(color) {
        var match = color.match(/rgba?\(([^)]+)\)/);
        if (!match) {
            return null;
        }

        var parts = match[1].split(',').map(function (part) {
            return part.trim();
        });

        if (parts.length < 3) {
            return null;
        }

        var r = parseFloat(parts[0]);
        var g = parseFloat(parts[1]);
        var b = parseFloat(parts[2]);
        var a = parts.length >= 4 ? parseFloat(parts[3]) : 1;

        if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(a)) {
            return null;
        }

        return { r: r, g: g, b: b, a: a };
    }

    function isTransparent(color) {
        if (!color) {
            return true;
        }

        if (color === 'transparent') {
            return true;
        }

        var rgb = parseRgb(color);
        if (!rgb) {
            return false;
        }

        return rgb.a === 0;
    }

    function getEffectiveBackground(element) {
        var el = element;
        while (el && el !== document.documentElement) {
            var style = window.getComputedStyle(el);
            if (style) {
                var bg = style.backgroundColor;
                if (!isTransparent(bg)) {
                    return bg;
                }
            }
            el = el.parentElement;
        }
        return 'rgb(255, 255, 255)';
    }

    function relativeLuminance(channel) {
        var normalized = channel / 255;
        if (normalized <= 0.03928) {
            return normalized / 12.92;
        }
        return Math.pow((normalized + 0.055) / 1.055, 2.4);
    }

    function getContrastColor(rgb) {
        var luminance = 0.2126 * relativeLuminance(rgb.r) +
            0.7152 * relativeLuminance(rgb.g) +
            0.0722 * relativeLuminance(rgb.b);

        var contrastWithBlack = (luminance + 0.05) / 0.05;
        var contrastWithWhite = 1.05 / (luminance + 0.05);

        if (contrastWithBlack >= contrastWithWhite) {
            return '#111111';
        }

        return '#ffffff';
    }

    function freezeBackground(cell) {
        var stored = cell.getAttribute('data-np-base-bg');
        if (!stored) {
            stored = getEffectiveBackground(cell);
            if (stored) {
                cell.setAttribute('data-np-base-bg', stored);
            }
        }

        if (!stored) {
            return null;
        }

        cell.style.setProperty('background-color', stored, 'important');
        cell.style.setProperty('background', stored, 'important');

        return stored;
    }

    function freezeTextColor(cell) {
        var stored = cell.getAttribute('data-np-base-color');
        if (!stored) {
            stored = window.getComputedStyle(cell).color;
            if (stored) {
                cell.setAttribute('data-np-base-color', stored);
            }
        }

        if (!stored) {
            return;
        }

        cell.style.setProperty('color', stored, 'important');
    }

    function applyContrast(cell, background) {
        var bgColor = background || getEffectiveBackground(cell);
        var rgb = parseRgb(bgColor);
        if (!rgb) {
            return;
        }

        var textColor = getContrastColor(rgb);
        cell.style.setProperty('color', textColor, 'important');
    }

    function enhanceRow(row) {
        var labelCell = row.querySelector('.np-spec-table__cell--label');
        var valueCell = row.querySelector('.np-spec-table__cell--value');
        if (!labelCell) {
            return;
        }

        var apply = function () {
            var labelBg = freezeBackground(labelCell);
            applyContrast(labelCell, labelBg);

            if (valueCell) {
                freezeBackground(valueCell);
                freezeTextColor(valueCell);
            }
        };

        apply();

        row.addEventListener('mouseenter', apply);
        row.addEventListener('mouseleave', apply);
        row.addEventListener('focusin', apply);
        row.addEventListener('focusout', apply);
    }

    function setup(table) {
        var rows = table.querySelectorAll('.np-spec-table__row');
        rows.forEach(enhanceRow);

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('np-spec-table__row')) {
                        enhanceRow(node);
                    }
                });

                if (mutation.type === 'attributes' && mutation.target.classList.contains('np-spec-table__row')) {
                    enhanceRow(mutation.target);
                }
            });
        });

        observer.observe(table, {
            childList: true,
            attributes: true,
            subtree: true,
            attributeFilter: ['class']
        });
    }

    function init() {
        var table = document.querySelector('.np-tab--datos-electricos .np-spec-table');
        if (!table) {
            return;
        }

        setup(table);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
